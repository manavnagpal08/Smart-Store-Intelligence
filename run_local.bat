@echo off
title Smart Store AI - Local Servers
echo ===================================================
echo   Starting Smart Store AI (Backend + Frontend)
echo ===================================================
echo.

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Smart Store Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting React + Vite Frontend on http://localhost:5173 ...
cd frontend
start "Smart Store Frontend (Vite)" cmd /k "npm run dev"
cd ..

echo.
echo ===================================================
echo   Both services are starting in new windows:
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://127.0.0.1:8000
echo   - API Docs: http://127.0.0.1:8000/docs
echo ===================================================
pause
