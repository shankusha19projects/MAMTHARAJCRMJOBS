@echo off
REM Rebuilds JobPilot-CRM.html so its offline snapshot contains the latest scraped jobs.
cd /d "%~dp0app"
call npm run build
pause
