# Performance Baseline (Quick Wins)

This is a minimal, low-risk performance baseline for the CRM.

## Backend
- Enable slow request logging using `SLOW_REQUEST_MS` (ms).
- Capture p95 latency and error rate for top routes.
- Review MongoDB indexes for top 5 endpoints.

Suggested env:
```
SLOW_REQUEST_MS=1000
```

## Frontend
- Track Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1).
- Use bundle analysis as needed to identify large dependencies.

## Next Steps
- Add APM tracing (OpenTelemetry).
- Introduce caching for hot endpoints (Redis).
- Add pagination defaults to reduce payload size.
