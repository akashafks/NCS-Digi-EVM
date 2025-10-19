@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

REM Change to script directory (project root)
pushd "%~dp0"

echo.
echo ==================================================
echo Digital EVM - Update dependencies and start app
echo ==================================================
echo.

REM Ensure no Electron instance is locking files
taskkill /IM electron.exe /F >nul 2>nul

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed or not in PATH.
  echo Please install Node.js LTS and try again: https://nodejs.org/
  pause
  exit /b 1
)

echo [1/5] Installing root dependencies...
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo Installation failed at root. Trying npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: Failed to install root dependencies.
    pause
    exit /b 1
  )
)

REM Optional: update outdated critical packages automatically each launch
echo Updating Browserslist DB...
call npx update-browserslist-db@latest >nul 2>nul

echo [2/5] Installing frontend dependencies...
pushd "Digital EVM 1"
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo Installation failed in Digital EVM 1. Trying npm install...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies.
    popd
    pause
    exit /b 1
  )
)

REM Optional: update Browserslist DB in frontend
call npx update-browserslist-db@latest >nul 2>nul

echo [3/5] Building frontend...
call npm run build
if errorlevel 1 (
  echo ERROR: Frontend build failed.
  popd
  pause
  exit /b 1
)
popd

echo [4/5] Verifying Electron can start...
call npm run start:electron
if errorlevel 1 (
  echo ERROR: Failed to start Electron app.
  pause
  exit /b 1
)

echo [5/5] App closed. Goodbye!
popd
endlocal
exit /b 0


