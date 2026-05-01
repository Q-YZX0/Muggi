#!/bin/bash
# Muggi - Script de Configuración Inicial (Frontend + Dependencias)

set -e

echo "🎨 Iniciando configuración de Muggi (Frontend)..."

# 1. Verificar Node.js y NPM
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js (v24)..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
        sudo apt install -y nodejs build-essential
    else
        echo "⚠️  Por favor, instala Node.js v24+ manualmente desde https://nodejs.org/"
        exit 1
    fi
else
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 24 ]; then
        echo "⚠️  Se recomienda Node.js v24+ (Detectado: v$NODE_VER). Algunas funciones de Next.js 16 pueden fallar."
    fi
fi

# 2. Instalar dependencias del Frontend
echo "📦 Instalando módulos de Muggi..."
npm install

# 3. Descargar WaraNode (Backend P2P)
WARA_NODE_DIR="wara"
SIBLING_WARA="../Wara"
WARA_NODE_REPO="https://github.com/Q-YZX0/Wara.git"

if [ -d "$SIBLING_WARA" ]; then
    echo "ℹ️  WaraNode detectado en carpeta hermana ($SIBLING_WARA). Usando instalación de desarrollo."
elif [ ! -d "$WARA_NODE_DIR" ]; then
    echo "📡 Descargando WaraNode desde el repositorio oficial..."
    git clone "$WARA_NODE_REPO" "$WARA_NODE_DIR"
    
    echo "📦 Configurando WaraNode..."
    cd "$WARA_NODE_DIR"
    npm install
    cd - > /dev/null
else
    echo "ℹ️  WaraNode ya está instalado en $WARA_NODE_DIR"
fi

echo "-------------------------------------------------------"
echo "✅ Configuración de ecosistema Muggi completa."
echo ""
echo "Para iniciar el desarrollo:"
echo "  npm run dev          # Inicia el Frontend"
echo "  npm run dev:node     # Inicia el Nodo (en paralelo)"
echo "-------------------------------------------------------"
