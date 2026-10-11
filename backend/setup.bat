@echo off
title Jarvis Mark III - Backend Setup
:: One-time: create the Python venv + install backend deps.
:: Run once; launchers detect .venv\Scripts\pythonw.exe afterwards.

set "HERE=%~dp0"
echo.
echo  =================================================
echo    JARVIS MARK III - Backend setup (one time)
echo  =================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!] python not found in PATH. Install Python 3.11+ from python.org
    pause
    exit /b 1
)

cd /d "%HERE%"

if exist ".venv\Scripts\python.exe" (
    echo  [1/2] venv already exists, skipping creation.
) else (
    echo  [1/2] Creating virtualenv...
    python -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] venv creation failed.
        pause
        exit /b 1
    )
)

echo  [2/2] Installing dependencies...
.venv\Scripts\python.exe -m pip install --quiet -r requirements.txt "uvicorn[standard]"
if %ERRORLEVEL% NEQ 0 (
    echo  [!] pip install failed.
    pause
    exit /b 1
)

echo.
echo  Backend ready. Launchers will auto-start it on 127.0.0.1:11711.
pause
exit /b 0
