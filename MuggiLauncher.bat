@echo off
echo Iniciando Muggi + WaraNode...
npm run dev:all
start "" "http://localhost:3000"
pause
