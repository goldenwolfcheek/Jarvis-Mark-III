@echo off
title Jarvis Mark III - Dev Mode
color 0B

:: ============================================================
::  JARVIS MARK III (Revised) - DEV MODE
::  Vite dev server (hot reload) + Electron pointed at it.
:: ============================================================

set "DESKTOP=%~dp0apps\desktop"

echo.
echo  ==================================================
echo    JARVIS MARK III - Revised  (DEV MODE)
echo  ==================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Node.js not found. Install it from https://nodejs.org
    pause
    exit /b 1
)

:: Kill anything stale on our dev port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1

cd /d "%DESKTOP%"

if not exist "node_modules\" (
    echo  [*] Installing dependencies (first run only)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] npm install failed.
        pause
        exit /b 1
    )
)

echo  [1/3] Starting Vite dev server on port 5174...
start "Jarvis Vite" /min cmd /c "npx vite --port 5174 --strictPort"

echo  [2/3] Waiting for Vite...
set /a tries=0
:wait_vite
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set /a tries+=1
    if %tries% LSS 30 goto wait_vite
    echo  [!] Vite did not start within 30s. Check the Vite window.
    pause
    exit /b 1
)
echo  [2/3] Vite ready.

echo  [3/3] Launching Electron (hot-reload against Vite)...
set "JARVIS_DEV=1"
npx electron .
set "JARVIS_DEV="

echo.
echo  Electron closed. Shutting Vite down...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1
exit /b 0
