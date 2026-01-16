# Muggi Windows Setup Script (PowerShell)
# Este script automatiza la instalacion de Muggi y WaraNode en entornos Windows.

$ErrorActionPreference = "Stop"

Write-Host "Iniciando configuracion de Muggi para Windows..." -ForegroundColor Cyan

# 1. Verificar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js no encontrado. Por favor, instalalo desde https://nodejs.org/" -ForegroundColor Red
    exit
}

# 2. Instalar dependencias del Frontend
Write-Host "Instalando modulos de Muggi (esto puede tardar un poco)..." -ForegroundColor Yellow
npm install

# 3. Configurar WaraNode (Backend P2P)
$WARA_NODE_DIR = "wara"
# Usamos el repo oficial de Wara
$WARA_NODE_REPO = "https://github.com/Q-YZX0/Wara.git"

if (!(Test-Path $WARA_NODE_DIR)) {
    Write-Host "Descargando WaraNode desde el repositorio oficial..." -ForegroundColor Yellow
    git clone $WARA_NODE_REPO $WARA_NODE_DIR
    
    Write-Host "Configurando WaraNode..." -ForegroundColor Yellow
    Set-Location $WARA_NODE_DIR
    
    # Verificar si hay script de despliegue para Windows (setup_node.ps1)
    if (Test-Path "setup.ps1") {
        Write-Host "Ejecutando script de configuracion de WaraNode..." -ForegroundColor Cyan
        powershell -NoProfile -ExecutionPolicy Bypass -File ".\setup_node.ps1"
    }
    elseif (Test-Path "setup.sh") {
        Write-Host "Nodo descargado. Se recomienda usar Git Bash para ejecutar deploy_node.sh si es necesario." -ForegroundColor Blue
        npm install
    }
    else {
        npm install
    }
    
    Set-Location ..
}
else {
    Write-Host "WaraNode ya esta instalado en $WARA_NODE_DIR" -ForegroundColor Blue
}

Write-Host "-------------------------------------------------------" -ForegroundColor Green
Write-Host "Configuracion de ecosistema Muggi completa." -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el desarrollo:"
Write-Host "  npm run dev          # Inicia el Frontend (http://localhost:3000)"
Write-Host "  npm run dev:node     # Inicia el Nodo (en paralelo)"
Write-Host "-------------------------------------------------------"
