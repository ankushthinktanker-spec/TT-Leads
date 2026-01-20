# Quick Start Guide

## Start Both Servers

### Option 1: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Windows PowerShell Script

Create `start-dev.ps1`:
```powershell
# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "✅ Both servers starting..."
Write-Host "Backend: http://localhost:5000"
Write-Host "Frontend: http://localhost:5173"
```

Run with: `.\start-dev.ps1`

## URLs

- **Frontend**: http://localhost:5173 (or 5174 if 5173 is busy)
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Default Login

After creating an admin user:
- **Email**: admin@thinktanker.com
- **Password**: admin123

## Troubleshooting

### Frontend Issues

**Port already in use:**
- Vite will automatically try the next port (5174, 5175, etc.)

**Missing dependencies:**
```bash
cd frontend
npm install
```

### Backend Issues

**MongoDB not running:**
```bash
# Start MongoDB service
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl start mongod
```

**Port 5000 in use:**
- Change PORT in `backend/.env`

**TypeScript errors:**
```bash
cd backend
npm install
npm run build  # Check for compilation errors
```

## First Time Setup

1. **Install MongoDB** (if not installed)
2. **Start MongoDB** service
3. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. **Create admin user** (see walkthrough.md)
5. **Start servers** (see above)
6. **Open browser** to http://localhost:5173
