# Security Baseline (Quick Wins)

This is the minimum security hardening checklist for the CRM without changing business logic.

## Access Control
- Enforce `protect` + `checkPermission` on all API routes.
- Keep Admin-only routes restricted via `authorize`/`requireRole`.
- Add unit tests for role/permission checks on sensitive endpoints.

## Auth & Sessions
- JWT access tokens with refresh token rotation recommended.
- Store refresh tokens securely (httpOnly cookies preferred).
- Rate-limit auth endpoints (`/auth/login`, `/auth/refresh-token`).

## Input Validation
- Ensure Joi schemas allow empty strings only where intended.
- Validate request payloads for all create/update endpoints.
- Normalize and sanitize rich text HTML input.

## CORS & Headers
- Use explicit allow-list for origins (set `CORS_ORIGINS`).
- Disable `x-powered-by` header.
- Keep `helmet` enabled.

## Secrets & Config
- Never commit secrets to git.
- Rotate JWT secrets on a schedule.
- Store secrets in a manager (AWS/GCP/HashiCorp) for prod.

## Logging & PII
- Redact `Authorization` and cookies from logs.
- Avoid logging raw request bodies with PII.

## File Uploads
- Validate file type and size.
- Store uploads outside the web root.
- Consider AV scanning for user uploads.

## Dependency Hygiene
- Run `npm audit --omit=dev` in CI.
- Enable Dependabot/Snyk alerts.
