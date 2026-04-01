@echo off
REM Development runner script for Windows - starts both backend and frontend

echo Starting GenDrive AI Development Environment...
echo.

REM Start backend in new window
echo 🚀 Starting Backend Server on port 5000...
start "GenDrive Backend" cmd /k "cd backend && npm start"

REM Give backend time to start
timeout /t 2 /nobreak

REM Start frontend in new window
echo ⚛️  Starting Frontend Server on port 3000...
start "GenDrive Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Both servers are starting in separate windows. Press Ctrl+C in each window to stop.
