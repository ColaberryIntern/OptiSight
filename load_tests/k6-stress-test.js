import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 1000 },
    { duration: '2m', target: 1000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export function setup() {
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

  const res = http.get(`${BASE_URL}/api/v1/dashboard/summary`, { headers });
  check(res, { 'status is 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);

  sleep(0.5);
}
