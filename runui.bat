@echo off
title Jarvis Mark III - Launcher
color 0B

:: ============================================================
::  JARVIS MARK III (Revised) - UI build + Electron launch
::  Simple and robust: always rebuild (vite is ~3s), always
::  patch, then launch Electron detached.
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

cd /d "%DESKTOP%" || (echo  [!] Cannot find %DESKTOP% & pause & exit /b 1)

:: Install dependencies on first run only
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

:: Always rebuild (fast) — removes the whole staleness-detection bug class
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

:: Launch Electron detached, then let the console close
echo  [3/3] Launching Jarvis...
start "" /b cmd /c "npx electron ."
exit /b 0
