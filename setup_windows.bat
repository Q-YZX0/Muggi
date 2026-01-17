@echo off
chcp 65001 > nul
echo Iniciando setup...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Hubo un error ejecutando el script de PowerShell.
    pause
    exit /b %ERRORLEVEL%
)
pause
