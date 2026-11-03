@echo off
rem SGM Foundry MTC - one-click launcher for the office PC.
rem First run builds the app (needs Node.js installed), then it starts the
rem server and opens the browser. Keep this window open while working.
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install --no-audit --no-fund || goto :error
)

if not exist ".next\BUILD_ID" (
  echo Building...
  call npm run build || goto :error
)

start "" http://localhost:3000
echo.
echo MTC running at http://localhost:3000 - close this window to stop.
call npm run start
goto :eof

:error
echo.
echo Something failed above. Send this window's text to whoever maintains the app.
pause
