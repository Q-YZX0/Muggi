#!/bin/bash
# Muggi - Script de Configuración Inicial (Frontend + Dependencias)

set -e

echo "🎨 Iniciando configuración de Muggi (Frontend)..."

# 1. Verificar Node.js y NPM
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js (v20)..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs build-essential
    else
        echo "⚠️  Por favor, instala Node.js manualmente desde https://nodejs.org/"
        exit 1
    fi
fi

# 2. Instalar dependencias del Frontend
echo "📦 Instalando módulos de Muggi..."
npm install

# 3. Descargar WaraNode (Backend P2P)
# Se instala dentro de 'wara' para mantener el proyecto organizado
WARA_NODE_DIR="wara"
WARA_NODE_REPO="https://github.com/Q-YZX0/Wara.git"

if [ ! -d "$WARA_NODE_DIR" ]; then
    echo "📡 Descargando WaraNode desde el repositorio oficial..."
    git clone "$WARA_NODE_REPO" "$WARA_NODE_DIR"
    
    echo "📦 Configurando WaraNode..."
    cd "$WARA_NODE_DIR"
    # Ejecutar el script de despliegue propio de wara-node
    if [ -f "deploy_node.sh" ]; then
        bash deploy_node.sh
    else
        npm install
    fi
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
