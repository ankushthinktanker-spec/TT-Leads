# Technical Overview

## 1) Stack Summary
Frontend:
- React 19 + Vite 7
- TypeScript
- Redux Toolkit
- React Router
- Tailwind CSS
- TipTap editor

Backend:
- Node.js + Express (TypeScript)
- MongoDB with Mongoose
- JWT auth with refresh tokens
- Puppeteer for PDF generation
- Joi validation
- Pino logging

## 2) Repository Structure
- frontend/: React app
- backend/: Express API
- docs/: Documentation

## 3) Core Data Flow
1. UI submits forms to REST endpoints under /api
2. Backend validates input (Joi), applies permissions, and writes to MongoDB
3. PDF generation uses proposal data to render HTML and Puppeteer to export PDF
4. Files stored under backend/uploads/ (logos and PDFs)

## 4) Key Frontend Areas
- Pages under frontend/src/pages
- Redux slices under frontend/src/store/slices
- API client under frontend/src/api/axios.ts
- Auth storage under frontend/src/utils/authStorage.ts

## 5) Key Backend Areas
- Routes under backend/src/routes
- Controllers under backend/src/controllers
- Models under backend/src/models
- Middleware under backend/src/middleware
- PDF service under backend/src/services/pdf.service.ts
