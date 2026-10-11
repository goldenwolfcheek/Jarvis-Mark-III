@echo off
title Jarvis Mark III - Launcher
color 0B

:: ============================================================
::  JARVIS MARK III (Revised) - UI build + Electron launch
::  Console-visible variant. Always rebuilds (~3s), launches
::  Electron via plain cmd /c (the pattern that works on this
::  machine). All failures pause so nothing disappears silently.
:: ============================================================

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

if not exist "%DESKTOP%" (
    echo  [!] Cannot find %DESKTOP%
    pause
    exit /b 1
)
cd /d "%DESKTOP%"

:: Start the backend (Python service on 11711) if not already running
:: Resolve project root regardless of invocation directory. If scripts sit
:: in <root> (normal double-click), use %~dp0; if some caller launches from
:: deeper (observed with some shell hosts), %~dp0 already contains apps\desktop.
set "BACKEND="
if exist "%~dp0backend\.venv\Scripts\pythonw.exe" set "BACKEND=%~dp0backend"
if not defined BACKEND if exist "%~dp0..\backend\.venv\Scripts\pythonw.exe" set "BACKEND=%~dp0..\backend"
if not defined BACKEND if exist "%~dp0desktop\..\backend\.venv\Scripts\pythonw.exe" set "BACKEND=%~dp0desktop\..\backend"
if not defined BACKEND set "BACKEND=I:\Code Shit\OpenCode\Projects\Jarvis Mark III - Revised\backend"
pushd "%BACKEND%"
set "BACKEND=%CD%"
popd
set "BACKEND_PYW=%BACKEND%\.venv\Scripts\pythonw.exe"
netstat -ano | findstr ":11711" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto backend_ok
if exist "%BACKEND_PYW%" (
    echo  [0/3] Starting backend...
    start "Jarvis Backend" /min cmd /c ""%BACKEND_PYW%" -m uvicorn jarvis3.server:app --host 127.0.0.1 --port 11711 --ws websockets-sansio"
    goto backend_started
)
echo  [0/3] Backend venv missing - run backend\setup.bat once to install.
goto backend_started
:backend_ok
echo  [0/3] Backend already running on 11711.
:backend_started

:: Install dependencies on first run only
:: (npx resolves .cmd shims; machine PATH carries nodejs)
if not exist "node_modules\" (
    echo  [1/3] First run - installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] npm install failed. See errors above.
        pause
        exit /b 1
    )
) else (
    echo  [1/3] Dependencies installed.
)

:: Always rebuild (fast) - removes the whole staleness-detection bug class
echo  [2/3] Building renderer...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Build failed. See errors above.
    pause
    exit /b 1
)

:: Inline module scripts must not carry crossorigin attr (file:// CORS freeze).
:: Quote-free node one-liner so cmd cannot mangle the escaping.
node -e "const f=require('fs');const q=String.fromCharCode(34);const a='<script type='+q+'module'+q+' crossorigin>';const b='<script type='+q+'module'+q+'>';let s=f.readFileSync('dist/index.html','utf8');s=s.split(a).join(b);f.writeFileSync('dist/index.html',s);console.log('crossorigin attr stripped');"
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Build patch failed. See errors above.
    pause
    exit /b 1
)

:: Launch Electron in the foreground via cmd /c - the pattern that works
:: without start wrapping. This bat stays open until Jarvis closes.
echo  [3/3] Launching Jarvis...
cmd /c "npx electron ."
echo.
echo  Jarvis closed.
pause
exit /b 0
