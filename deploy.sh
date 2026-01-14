#!/bin/bash

# Muggi Quick Deploy Script for Ubuntu
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e  # Exit on error

echo "🚀 Muggi Deployment Script"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root. Use a regular user with sudo privileges.${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${YELLOW}📦 Checking dependencies...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION installed${NC}"
fi

# Check npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check PM2
if ! command_exists pm2; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

echo -e "${YELLOW}📦 Installing project dependencies...${NC}"

# Main project
npm install

# WaraLib
cd wara-lib
npm install
cd ..

# Tracker
cd wara-tracker
npm install
cd ..

# Web3 (optional)
if [ -d "web3" ]; then
    cd web3
    npm install
    cd ..
fi

echo -e "${YELLOW}🗄️  Setting up database...${NC}"
npx prisma generate
npx prisma db push

echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

echo -e "${YELLOW}🔥 Starting services with PM2...${NC}"
pm2 start ecosystem.config.js

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "🌐 Access your application:"
echo "   Web UI:     http://$(hostname -I | awk '{print $1}'):3000"
echo "   WaraNode:   http://$(hostname -I | awk '{print $1}'):21746/status"
echo "   Tracker:    http://$(hostname -I | awk '{print $1}'):21750/peers"
echo ""
echo "📝 Useful commands:"
echo "   pm2 logs          - View logs"
echo "   pm2 restart all   - Restart services"
echo "   pm2 stop all      - Stop services"
echo "   pm2 monit         - Monitor resources"
echo ""
echo -e "${GREEN}🎉 Happy streaming!${NC}"
