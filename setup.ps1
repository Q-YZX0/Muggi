# Muggi Windows Setup Script (PowerShell)
# Este script automatiza la instalacion de Muggi y WaraNode en entornos Windows.

$ErrorActionPreference = "Stop"

Write-Host "Iniciando configuracion de Muggi para Windows..." -ForegroundColor Cyan

# 1. Verificar Node.js
$nodeVersion = node -v
if ($nodeVersion -match "v(\d+)") {
    $major = [int]$Matches[1]
    if ($major -lt 24) {
        Write-Host "⚠️ Se recomienda Node.js v24+ (Detectado: $nodeVersion). Algunas funciones de Next.js 16 pueden fallar." -ForegroundColor Yellow
    }
}
else {
    Write-Host "Node.js no encontrado. Por favor, instalalo desde https://nodejs.org/" -ForegroundColor Red
    exit
}

# 2. Instalar dependencias del Frontend
Write-Host "Instalando modulos de Muggi (esto puede tardar un poco)..." -ForegroundColor Yellow
npm install

# 3. Configurar WaraNode (Backend P2P)
$WARA_NODE_DIR = "wara"
$SIBLING_WARA = "../Wara"
$WARA_NODE_REPO = "https://github.com/Q-YZX0/Wara.git"

if (Test-Path $SIBLING_WARA) {
    Write-Host "WaraNode detectado en carpeta hermana ($SIBLING_WARA). Usando instalacion de desarrollo." -ForegroundColor Cyan
}
elseif (!(Test-Path $WARA_NODE_DIR)) {
    Write-Host "Descargando WaraNode desde el repositorio oficial..." -ForegroundColor Yellow
    git clone $WARA_NODE_REPO $WARA_NODE_DIR
    
    Write-Host "Configurando WaraNode..." -ForegroundColor Yellow
    Set-Location $WARA_NODE_DIR
    npm install
    Set-Location ..
}
else {
    Write-Host "WaraNode ya esta instalado en $WARA_NODE_DIR" -ForegroundColor Blue
}

Write-Host "-------------------------------------------------------" -ForegroundColor Green
Write-Host "Configuracion de ecosistema Muggi completa." -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el desarrollo:"
Write-Host "  Ejecuta 'start.bat' para abrir todo (Frontend + Nodo + Navegador)"
Write-Host "  O usa: npm run dev:all"
Write-Host "-------------------------------------------------------"
