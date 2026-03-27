# ThinkTanker CRM Suite Master Documentation

## 1. Product Overview

ThinkTanker CRM Suite is a multi-tenant CRM and revenue operations platform for lead management, pipeline execution, proposals, contracts, invoices, subscriptions, analytics, reporting, and role-based administration.

Primary business capabilities:
- authentication and role-based access
- tenant-aware user management
- leads, companies, contacts, activities, and tasks
- deals and pipelines
- proposals with PDF generation
- contracts, invoices, and subscriptions
- analytics dashboards and operational reports
- notifications and audit/security events

## 2. Current Tech Stack

Backend:
- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- JWT access and refresh tokens
- Joi validation
- Pino logging
- Puppeteer for PDF generation

Frontend:
- React
- TypeScript
- Vite
- Redux Toolkit
- Axios
- Tailwind CSS
- React Router
- React Hook Form + Zod
- TipTap editor

## 3. Repository Structure

```text
backend/
  src/
    app.ts
    server.ts
    config/
    controllers/
    middleware/
    models/
    repositories/
    routes/
    services/
    utils/
    validators/
    scripts/

frontend/
  src/
    App.tsx
    api/
    components/
    pages/
    store/
    styles/
    theme/
    utils/

docs/
  historical and module-specific docs consolidated into this file
```

## 4. Core Modules

### Identity and Access
- login
- logout
- refresh token rotation
- user profile
- user administration
- roles and permissions

### CRM Core
- leads
- companies
- contacts
- activities
- tasks
- follow-up workflows

### Revenue Operations
- deals
- pipelines
- proposals
- contracts
- invoices
- subscriptions

### Reporting and Analytics
- dashboard KPIs
- funnel and velocity metrics
- operational reports
- exports

### Platform Services
- notifications
- audit logs
- security events
- file handling
- PDF generation

## 5. API Overview

Base URL:
- `http://localhost:5000/api`

Main route groups:
- `/auth`
- `/users`
- `/roles`
- `/permissions`
- `/settings`
- `/leads`
- `/companies`
- `/contacts`
- `/activities`
- `/tasks`
- `/deals`
- `/pipelines`
- `/proposals`
- `/proposal-templates`
- `/contracts`
- `/invoices`
- `/subscriptions`
- `/analytics`
- `/reports`
- `/notifications`

## 6. Frontend Routes

Main application areas:
- login and auth recovery
- dashboard
- leads
- companies
- contacts
- proposals
- tasks
- users
- settings
- reports
- analytics
- deals
- pipelines
- contracts
- invoices
- subscriptions

## 7. Authentication and Credentials

Current verified admin login:
- email: `admin@example.com`
- password: `Admin@12345`

Important note:
- older docs and scripts referenced other default passwords such as `Admin@123`
- the verified working credential is the one above

## 8. Local Environment

Backend:
- port: `5000`
- env file: `backend/.env`
- database: MongoDB Atlas connection currently configured

Frontend:
- port: `5173`
- env file: `frontend/.env`
- API calls use Vite proxy to the backend

## 9. How To Run

### Backend
Recommended stable runtime:
- `cd backend`
- `npm run build`
- `node dist/server.js`

### Frontend
- `cd frontend`
- `npm run dev`

### Current live local state
At the time of consolidation, the stable backend runtime was the compiled server process rather than the old unstable `nodemon + ts-node` path.

## 10. Current Runtime Notes

Recent fixes completed:
- frontend login flow no longer refreshes stale tokens on auth routes
- stale browser auth storage is cleared before fresh login
- backend auth request typing was corrected
- duplicate local frontend and backend processes were cleaned up
- backend login endpoint was verified locally

## 11. Known Operational Issue

The old backend dev path using `npm run dev` with `nodemon/ts-node` was unstable in this environment and caused:
- repeated crashes
- duplicate process trees
- `EADDRINUSE` on port `5000`

Recommended follow-up:
- keep the build-first dev runner or
- fully refactor backend dev startup so only one managed process exists

## 12. Architecture Summary

Recommended architecture:
- modular monolith
- internal event-driven side effects
- queue-backed background jobs
- object storage for generated files
- stronger tenant isolation
- long-term path toward PostgreSQL for the transactional core

Recommended bounded contexts:
- identity
- tenancy
- crm
- revenue
- reporting
- engagement
- platform

## 13. Security Summary

Key security patterns already present or required:
- short-lived access tokens
- refresh token rotation
- role and permission checks
- tenant-aware authorization
- validation on API requests
- security event logging
- audit logging for sensitive changes
- file validation for uploads

## 14. Reporting and Analytics

Reporting requirements already present:
- dashboard metrics
- funnel and velocity views
- lead reports
- activity reports
- company reports
- export support

Architectural recommendation:
- move heavy reporting toward read models and precomputed aggregates

## 15. Development Standards

Recommended standards:
- keep business logic out of controllers
- enforce tenant scope in repositories/services
- move expensive work to async jobs
- keep one frontend runner and one backend runner locally
- use structured logs and request IDs
- treat documentation updates through this master file only

## 16. Immediate Next Technical Priorities

1. stabilize backend dev startup permanently
2. introduce Redis-backed queue processing
3. move PDF, email, export, and reminder work to background jobs
4. move generated files to object storage
5. modularize backend by domain
6. strengthen reporting read models
7. prepare relational migration strategy for long-term scale

## 17. Troubleshooting

### If login fails
- hard refresh the browser
- clear browser storage if stale auth is suspected
- verify backend health on `http://localhost:5000/health`
- use `admin@example.com` / `Admin@12345`

### If backend appears down
- check port `5000`
- verify only one backend process is running
- prefer `node dist/server.js` if the old dev path is unstable

### If frontend behaves inconsistently
- verify only one Vite process is serving `5173`
- hard refresh the page after backend changes

## 18. Final Note

This file is now the single source of project documentation for functionality, runtime behavior, architecture, setup, and operational guidance.
