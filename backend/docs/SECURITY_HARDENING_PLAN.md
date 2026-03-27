# Backend Security Hardening Plan

## 1) Current Stack Assessment
- Runtime/Framework: Node.js + Express + TypeScript
- Auth: JWT access + refresh tokens
- DB/ORM: MongoDB + Mongoose
- Validation: Joi
- Uploads: Multer local disk (`uploads/`)
- Logging: pino + pino-http
- Authorization: role + permission matrix middleware

## 2) High-Risk Areas Identified
- Refresh token replay risk without server-side revocation list
- Missing account lockout on repeated login failures
- Weak password policy (length-only)
- Potential IDOR in proposal section reorder and some analytics/report scope paths
- Mass assignment risk in admin user update route
- Attachment upload type checks incomplete in contracts route
- Incomplete production env validation and timeout controls
- Missing tamper-evident audit trail for sensitive admin actions

## 3) Hardening Controls Implemented
- Strict env validation (`src/config/env.ts`)
- Password policy strengthened (length + complexity)
- Login lockout (`MAX_LOGIN_ATTEMPTS`, `LOGIN_LOCK_MINUTES`)
- Refresh token rotation + revoke list (`RevokedToken` model)
- Client binding for refresh tokens (IP + User-Agent fingerprint hash)
- Per-route auth rate limits for `/api/auth/login` and `/api/auth/refresh-token`
- Global request sanitization and timeout middleware in app bootstrap
- Expanded log redaction for tokens/passwords
- Security event logging model/service for suspicious flows
- Tamper-evident audit logs for user/role sensitive operations
- Upload hardening (filename sanitization + MIME/ext allowlist)
- IDOR fix in proposal section reordering ownership checks
- Scope fixes in reports/analytics history aggregates
- Standardized safer error shape in global error handler
- Field-level encryption for sensitive business identifiers (`gst`, `pan`, `registrationNumber`) in Company model
- Backfill migration script for legacy plaintext fields (`npm run migrate:encrypt-sensitive`)

## 4) Security Test Coverage Added
- Password policy validation smoke checks
- RBAC policy utility checks
- File upload validation checks
- Rate limit behavior integration check
- Encryption round-trip check
- Script: `npm run test:security`

## 5) Go-live Security Checklist
- Use strong production secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- Set `NODE_ENV=production`
- Enforce TLS at edge/load balancer
- Restrict CORS allowlist to internal trusted domains only
- Use least-privilege MongoDB user (readWrite only required DB)
- Enable dependency scanning in CI (`npm audit --omit=dev`)
- Run `npm run security:ci` in pipeline
- Rotate credentials on schedule
- Centralize logs and alert on:
  - repeated 401/403 from same IP
  - repeated failed logins
  - role/permission modifications
  - refresh binding mismatch/revoke events
- Backup and retention policy for audit/security event collections
