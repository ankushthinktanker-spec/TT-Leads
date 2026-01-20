# ThinkTanker CRM Suite

Lead generation + lead management CRM for ThinkTanker IT Services with proposals, contacts, tasks, and analytics.

## Features

- Authentication with refresh tokens and role-based permissions
- Leads: create, assign, track stages, follow-ups, and health
- Companies + contacts with quick add and linking
- Proposals: rich-text sections, TOC, PDF export
- Tasks and activities tracking
- Reports and analytics dashboards
- Settings for roles, permissions, and company profile

## Tech Stack

Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT auth
- Joi validation
- Puppeteer for proposal PDF generation

Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS
- Redux Toolkit
- React Router
- Axios
- TipTap editor for proposal sections

## Project Structure

```
backend/                 API server
  src/
    config/              Database/app config
    controllers/         Route handlers
    middleware/          Auth, permissions, error handling
    models/              Mongoose models
    routes/              API routes
    services/            PDF generation and helpers
    utils/               Utilities
    validators/          Joi schemas
  uploads/               Generated PDFs/logos (local)
frontend/                Web app
  src/
    components/          Reusable UI and feature components
    pages/               Page-level routes
    store/               Redux slices
    api/                 Axios client
    lib/                 UI/utils
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Environment Variables

Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thinktanker-crm
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Run

```bash
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
```

Or use the root script:

```powershell
./start-dev.ps1
```

## Core Modules

- Auth: login, refresh, logout, profile
- Leads: list, filters, status, follow-ups
- Companies: CRM account records
- Contacts: contact directory tied to companies
- Proposals: rich sections, TOC, PDF export
- Tasks: assignments and reminders
- Analytics/Reports: KPIs and exports
- Settings: roles, permissions, company info

## API Endpoints

Base URL: `http://localhost:5000/api`

Auth
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/register` (Admin)
- `GET /auth/me`
- `PUT /auth/profile`
- `PUT /auth/change-password`
- `POST /auth/logout`

Leads
- `GET /leads`
- `GET /leads/my-leads`
- `GET /leads/stuck`
- `GET /leads/:id`
- `POST /leads`
- `PUT /leads/:id`
- `DELETE /leads/:id` (Admin/Manager)
- `PATCH /leads/:id/status`
- `PATCH /leads/:id/followup`
- `PATCH /leads/:id/assign` (Admin/Manager)
- `POST /leads/:id/notes`
- `GET /leads/:id/activities`
- `POST /leads/:id/activities`

Companies
- `GET /companies`
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id` (Admin/Manager)

Contacts
- `GET /contacts`
- `POST /contacts`
- `GET /contacts/:id`
- `PUT /contacts/:id`
- `DELETE /contacts/:id`

Proposals
- `GET /proposals`
- `POST /proposals`
- `POST /proposals/from-template/:templateId`
- `GET /proposals/:id`
- `PUT /proposals/:id`
- `DELETE /proposals/:id` (Admin/Manager)
- `POST /proposals/logo`
- `GET /proposals/logo/:fileName`
- `POST /proposals/:id/sections`
- `PUT /proposals/:id/sections/:sectionId`
- `DELETE /proposals/:id/sections/:sectionId`
- `POST /proposals/:id/sections/reorder`
- `POST /proposals/:id/duplicate`
- `POST /proposals/:id/generate-pdf`
- `GET /proposals/:id/download`
- `GET /proposals/:id/pdf`

Proposal Templates
- `GET /proposal-templates`
- `POST /proposal-templates` (Admin/Manager)
- `GET /proposal-templates/:id`
- `PUT /proposal-templates/:id` (Admin/Manager)
- `DELETE /proposal-templates/:id` (Admin)

Tasks
- `GET /tasks`
- `POST /tasks`
- `GET /tasks/:id`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `PATCH /tasks/:id/complete`

Activities
- `GET /activities`
- `POST /activities`
- `GET /activities/:id`
- `PUT /activities/:id`
- `DELETE /activities/:id`

Analytics
- `GET /analytics/dashboard`
- `GET /analytics/funnel`
- `GET /analytics/velocity`
- `GET /analytics/forecast`
- `GET /analytics/loss`
- `GET /analytics/quality`

Reports
- `GET /reports/leads/register`
- `GET /reports/leads/source`
- `GET /reports/leads/status`
- `GET /reports/leads/aging`
- `GET /reports/leads/response-time`
- `GET /reports/leads/duplicates`
- `GET /reports/followups/due-vs-completed`
- `GET /reports/followups/overdue`
- `GET /reports/activities`
- `GET /reports/leads/no-activity`
- `GET /reports/pipeline/value`
- `GET /reports/pipeline/weighted`
- `GET /reports/deals/won`
- `GET /reports/deals/lost`
- `GET /reports/conversion`
- `GET /reports/deal-cycle`
- `GET /reports/team/performance`
- `GET /reports/team/workload`
- `GET /reports/finance/payments`
- `GET /reports/finance/proposal-to-payment`

Users (Admin)
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

Settings (Admin)
- `GET /settings/:type`
- `PUT /settings/:type`

Permissions (Admin)
- `GET /permissions`
- `GET /permissions/me`
- `PUT /permissions/:role`

Roles (Admin)
- `GET /roles`
- `POST /roles`
- `PUT /roles/:id`
- `DELETE /roles/:id`

## Troubleshooting

- Mongo connection issues: verify `MONGODB_URI`
- PDF export issues: ensure Chrome/Chromium is available for Puppeteer
- CORS issues: check `FRONTEND_URL`

## License

ISC

## Author

ThinkTanker IT Services
