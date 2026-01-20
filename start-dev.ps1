# Get the absolute path of the script directory
$ScriptRoot = $PSScriptRoot

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npm is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check directories
if (-not (Test-Path "$ScriptRoot\backend")) {
    Write-Host "❌ Error: 'backend' directory not found at $ScriptRoot\backend" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$ScriptRoot\frontend")) {
    Write-Host "❌ Error: 'frontend' directory not found at $ScriptRoot\frontend" -ForegroundColor Red
    exit 1
}

# Start backend in new window
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptRoot\backend'; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow
