@echo off
title Jarvis Mark III - Launcher
color 0B

:: ══════════════════════════════════════════════════════════════
::  JARVIS MARK III (Revised) - UI build + Electron launch
::  Builds the renderer if needed, then opens the desktop app.
:: ══════════════════════════════════════════════════════════════

set "DESKTOP=%~dp0apps\desktop"

echo.
echo  ==================================================
echo    JARVIS MARK III - Revised  (UI)
echo  ==================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Node.js not found. Install it from https://nodejs.org
    pause
    exit /b 1
)

:: Check dependencies (first run only)
if not exist "%DESKTOP%\node_modules\" (
    echo  [1/3] First run - installing dependencies, this takes a few minutes...
    cd /d "%DESKTOP%" && call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] npm install failed. See errors above.
        pause
        exit /b 1
    )
) else (
    echo  [1/3] Dependencies installed.
)

:: Build renderer if needed (dist missing or any src change is newer than dist)
cd /d "%DESKTOP%"
set "NEED_BUILD=0"
if not exist "dist\index.html" set "NEED_BUILD=1"
if %NEED_BUILD%==0 (
    for /f %%i in ('powershell -NoProfile -Command "(Get-ChildItem -Recurse src,electron,*.json,*.ts,*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime.Ticks"') do set "SRC_TIME=%%i"
    for /f %%i in ('powershell -NoProfile -Command "(Get-Item dist\index.html).LastWriteTime.Ticks"') do set "DIST_TIME=%%i"
    if %SRC_TIME% GTR %DIST_TIME% set "NEED_BUILD=1"
)

if %NEED_BUILD%==1 (
    echo  [2/3] Building renderer...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] Build failed. See errors above.
        pause
        exit /b 1
    )
) else (
    echo  [2/3] Renderer bundle up to date.
)

:: Launch Electron
echo  [3/3] Launching Jarvis...
start "" /b cmd /c "npx electron ."
exit /b 0
