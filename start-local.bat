@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ================================================
echo   44day_  local dev server
echo   http://localhost:3000
echo   http://localhost:3000/admin
echo ================================================
echo.

start "" http://localhost:3000
npm start
pause
