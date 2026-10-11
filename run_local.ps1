# Smart Store AI - Local Servers Launcher (PowerShell)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Smart Store AI (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = $PSScriptRoot

# 1. Start Backend in new process
Write-Host "[1/2] Launching Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath'; python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Frontend in new process
Write-Host "[2/2] Launching Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootPath\frontend'; npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  Both servers launched successfully:" -ForegroundColor Yellow
Write-Host "  - Frontend UI : http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API : http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Yellow
