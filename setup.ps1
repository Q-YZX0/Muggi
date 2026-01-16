# Muggi Windows Setup Script (PowerShell)
# Este script automatiza la instalación de Muggi y WaraNode en entornos Windows.

$ErrorActionPreference = "Stop"

Write-Host "🎨 Iniciando configuración de Muggi para Windows..." -ForegroundColor Cyan

# 1. Verificar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js no encontrado. Por favor, instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit
}

# 2. Instalar dependencias del Frontend
Write-Host "📦 Instalando módulos de Muggi (esto puede tardar un poco)..." -ForegroundColor Yellow
npm install

# 3. Configurar WaraNode (Backend P2P)
$WARA_NODE_DIR = "wara"
# Usamos el repo oficial de Wara
$WARA_NODE_REPO = "https://github.com/Q-YZX0/Wara.git"

if (!(Test-Path $WARA_NODE_DIR)) {
    Write-Host "📡 Descargando WaraNode desde el repositorio oficial..." -ForegroundColor Yellow
    git clone $WARA_NODE_REPO $WARA_NODE_DIR
    
    Write-Host "📦 Configurando WaraNode..." -ForegroundColor Yellow
    Set-Location $WARA_NODE_DIR
    
    # Verificar si hay script de despliegue para Windows o usar npm install
    if (Test-Path "deploy_node.sh") {
        Write-Host "ℹ️ Nodo descargado. Se recomienda usar Git Bash para ejecutar deploy_node.sh si es necesario." -ForegroundColor Blue
        npm install
    } else {
        npm install
    }
    
    Set-Location ..
} else {
    Write-Host "ℹ️ WaraNode ya está instalado en $WARA_NODE_DIR" -ForegroundColor Blue
}

Write-Host "-------------------------------------------------------" -ForegroundColor Green
Write-Host "✅ Configuración de ecosistema Muggi completa." -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el desarrollo:"
Write-Host "  npm run dev          # Inicia el Frontend (http://localhost:3000)"
Write-Host "  npm run dev:node     # Inicia el Nodo (en paralelo)"
Write-Host "-------------------------------------------------------"
