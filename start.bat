@echo off
echo Starting AIPasta Backend and Frontend...
echo.

:: Start backend in a new window
start "AIPasta Backend" cmd /k "cd /d %~dp0aipasta-backend && npm run dev"

:: Small delay to let backend initialize first
timeout /t 3 /nobreak > nul

:: Start frontend in a new window
start "AIPasta Frontend" cmd /k "cd /d %~dp0aipasta-frontend\my-app && npm run dev"

echo Both servers starting...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
