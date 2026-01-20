# Observability (Baseline)

This document defines the minimal observability baseline for the ThinkTanker CRM.

## Goals
- Correlate requests across logs and services.
- Capture backend errors with enough context to debug quickly.
- Provide a path to metrics and tracing without changing business logic.

## Current Baseline
- Request logs via `pino-http` (backend).
- Request IDs on every response header: `x-request-id`.

## Recommended Additions

### Error Tracking
Use Sentry or similar for both backend and frontend.

Backend (suggested)
- `SENTRY_DSN`
- `SENTRY_ENV`
- `SENTRY_RELEASE`

Frontend (suggested)
- `VITE_SENTRY_DSN`
- `VITE_APP_ENV`

### Metrics & Tracing
Add OpenTelemetry when ready:
- Metrics: request count, error count, p95 latency
- Traces: per-route latency breakdowns, DB calls, external requests

### Dashboards (starter)
- API success rate (2xx/total)
- API error rate (4xx/5xx)
- p95 latency by route
- DB connection health
- Worker/queue lag (if added)

### Alerts
- Error rate > 2% for 10 minutes
- p95 latency > 1000ms for 10 minutes
- Auth failures spike

## Notes
- Request IDs are now included in logs and returned to clients.
- Sensitive headers are redacted in logs (`Authorization`, cookies).
