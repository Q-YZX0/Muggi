@echo off
setlocal
cd /d "%~dp0"

:: Nombre del archivo marcador
set MARKER_FILE=.installed

:: Verificar si ya se instaló previamente
if exist "%MARKER_FILE%" (
    echo [INFO] Instalacion previa detectada. Iniciando Muggi...
    goto :Launch
)

echo [SETUP] No se detecto instalacion previa. Ejecutando script de configuracion...

:: Ejecutar el script setup.ps1 existente
powershell -NoProfile -ExecutionPolicy Bypass -File ".\setup.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] setup.ps1 fallo. Revisa los errores arriba.
    pause
    exit /b %ERRORLEVEL%
)

:: Crear archivo marcador
echo Setup completado > "%MARKER_FILE%"
echo [SETUP] Configuracion finalizada exitosamente.

:Launch
echo [LAUNCH] Iniciando servicios...

:: Iniciar Muggi Server (Frontend)
start "Muggi Frontend" cmd /k "npm run dev"

:: Iniciar WaraNode Server (Backend)
:: Se asume que setup.ps1 creo la carpeta 'wara' dentro de Muggi o que ya exisita
start "WaraNode Backend" cmd /k "cd wara && npm start"

echo [LAUNCH] Esperando a que los servidores arranquen (15s)...
timeout /t 15

echo [LAUNCH] Abriendo interfaz de usuario...
start chrome --app=http://localhost:3000

exit
