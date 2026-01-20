# ThinkTanker Lead Management System - Backend

A comprehensive Lead Generation + Lead Management system for ThinkTanker IT Services.

## Features

- ✅ JWT Authentication with Refresh Tokens
- ✅ Role-Based Access Control (Admin, Manager, BDM, Marketing)
- ✅ User Management
- ✅ Lead Management with Kanban
- ✅ Activity Tracking
- ✅ Proposal Creation
- ✅ Email Integration
- ✅ Analytics & Reports

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

### Environment Variables

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thinktanker-leads
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@thinktanker.com
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (Admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/refresh-token` - Refresh token
- `POST /api/auth/logout` - Logout

### Health Check
- `GET /health` - API health status

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── validators/      # Joi validation schemas
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── dist/                # Compiled JavaScript
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run with auto-reload
npm run dev

# Lint code
npm run lint

# Run tests
npm test
```

## License

ISC
