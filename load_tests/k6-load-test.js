import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 200 },  // Spike to 200
    { duration: '1m', target: 200 },   // Hold at 200
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests under 200ms
    errors: ['rate<0.01'],              // Error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

let authToken = '';

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${BASE_URL}/api/v1/users/login`, JSON.stringify({
    email: 'admin@optisight.ai',
    password: 'Admin123!',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status === 200) {
    return { token: JSON.parse(loginRes.body).token };
  }
  return { token: '' };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  group('Health Checks', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'gateway health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    responseTime.add(res.timings.duration);
  });

  group('Dashboard API', () => {
    const res = http.get(`${BASE_URL}/api/v1/dashboard/summary`, { headers });
    check(res, { 'dashboard summary 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    responseTime.add(res.timings.duration);
  });

  group('Analytics - Revenue Anomalies', () => {
    const res = http.get(`${BASE_URL}/api/v1/analytics/revenue-anomalies?period=30d`, { headers });
    check(res, { 'anomalies 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    responseTime.add(res.timings.duration);
  });

  group('Analytics - Sales Forecast', () => {
    const res = http.get(`${BASE_URL}/api/v1/analytics/sales-forecast?periods=30`, { headers });
    check(res, { 'forecast 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    responseTime.add(res.timings.duration);
  });

  group('Products API', () => {
    const res = http.get(`${BASE_URL}/api/v1/data/products?page=1&limit=20`, { headers });
    check(res, { 'products 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    responseTime.add(res.timings.duration);
  });

  group('Notifications', () => {
    // Use a dummy userId - in real tests this would come from login
    const res = http.get(`${BASE_URL}/api/v1/notifications/test-user/unread-count`, { headers });
    check(res, { 'notifications status ok': (r) => r.status === 200 || r.status === 404 });
    responseTime.add(res.timings.duration);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load_tests/results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const metrics = data.metrics;
  let summary = '\n=== Load Test Results ===\n\n';

  if (metrics.http_req_duration) {
    summary += `Response Time (p95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `Response Time (avg): ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `Response Time (max): ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  }
  if (metrics.http_reqs) {
    summary += `Total Requests: ${metrics.http_reqs.values.count}\n`;
    summary += `Requests/sec: ${metrics.http_reqs.values.rate.toFixed(2)}\n`;
  }
  if (metrics.errors) {
    summary += `Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }

  summary += '\n=== Thresholds ===\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    summary += `${name}: ${threshold.ok ? 'PASS' : 'FAIL'}\n`;
  }

  return summary;
}
