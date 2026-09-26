@echo off
title JobPilot CRM - live server
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 18+ is required: https://nodejs.org & pause & exit /b 1)
if not exist "node_modules" (echo Installing server dependencies... & call npm install --no-audit --no-fund)
if not exist "JobPilot-CRM.html" (
  echo Building the app for the first time...
  pushd app && call npm install --no-audit --no-fund && call npm run build && popd
)
echo Starting JobPilot CRM on http://localhost:4321  (keep this window open)
node server\server.js
pause
