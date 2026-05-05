@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ================================================
echo   44day_  publish to GitHub  ^&  Render
echo ================================================
echo.

git status --short
echo.

set /p msg="Commit message (Enter = 'update'): "
if "%msg%"=="" set msg=update

echo.
echo [1/3] git add ...
git add -A

echo.
echo [2/3] git commit ...
git commit -m "%msg%"

echo.
echo [3/3] git push ...
git push
if errorlevel 1 (
  echo.
  echo [!] push failed. check internet / GitHub auth
  pause
  exit /b 1
)

echo.
echo ================================================
echo   DONE!  Render will rebuild in ~3 minutes
echo   https://four4day.onrender.com
echo ================================================
echo.

choice /c YN /m "Open the live site now"
if errorlevel 2 goto end
start https://four4day.onrender.com

:end
echo.
pause
