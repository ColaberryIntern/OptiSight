# Load Testing

## Prerequisites
Install k6: https://k6.io/docs/get-started/installation/

## Run Tests

### Load Test (moderate load)
```bash
k6 run k6-load-test.js
```

### Stress Test (high load)
```bash
k6 run k6-stress-test.js
```

### Custom base URL
```bash
k6 run -e BASE_URL=https://staging.optisight.ai k6-load-test.js
```

## Thresholds
- Load test: 95th percentile response time < 200ms, error rate < 1%
- Stress test: 99th percentile response time < 500ms, error rate < 5%
