#!/bin/bash

# Rocket Landing Simulator - Mobile Access Setup
# This script configures your desktop to allow mobile access

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Rocket Landing Simulator - Mobile Access${NC}"
echo "=============================================="
echo ""

# Get local IP address
echo -e "${YELLOW}Detecting your local IP address...${NC}"
LOCAL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}✗ Could not detect local IP address${NC}"
    echo "Please find your IP manually with: ip addr"
    exit 1
fi

echo -e "${GREEN}✓ Local IP: $LOCAL_IP${NC}"
echo ""

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status | grep -q "Status: active"; then
        sudo ufw allow 5173/tcp comment 'Rocket Frontend' >/dev/null 2>&1 || true
        sudo ufw allow 8001/tcp comment 'Rocket Backend' >/dev/null 2>&1 || true
        echo -e "${GREEN}✓ UFW firewall rules added${NC}"
    else
        echo -e "${YELLOW}⚠ UFW is installed but not active${NC}"
    fi
elif command -v firewall-cmd >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=5173/tcp >/dev/null 2>&1 || true
    sudo firewall-cmd --permanent --add-port=8001/tcp >/dev/null 2>&1 || true
    sudo firewall-cmd --reload >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ firewalld rules added${NC}"
else
    echo -e "${YELLOW}⚠ No firewall detected, skipping...${NC}"
fi
echo ""

# Kill existing processes
echo -e "${YELLOW}Stopping existing servers...${NC}"
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Stopped${NC}"
echo ""

# Start Backend
echo -e "${YELLOW}Starting backend server...${NC}"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend with 0.0.0.0 to allow external access
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8001 > /tmp/rocket-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Start Frontend
echo -e "${YELLOW}Starting frontend server...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Start frontend with --host to allow external access
nohup npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/rocket-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for servers to start
echo ""
echo -e "${YELLOW}Waiting for servers to initialize...${NC}"
sleep 3

# Check if servers are running
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend failed to start. Check logs:${NC}"
    echo "  tail -f /tmp/rocket-backend.log"
    exit 1
fi

if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${RED}✗ Frontend failed to start. Check logs:${NC}"
    echo "  tail -f /tmp/rocket-frontend.log"
    exit 1
fi

# Display access information
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Servers Started! 🎮                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 Access from your phone:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Open this URL in your phone's browser:${NC}"
echo ""
echo -e "  ${YELLOW}http://$LOCAL_IP:5173${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💻 Access from this computer:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Frontend: ${YELLOW}http://localhost:5173${NC}"
echo -e "  Backend:  ${YELLOW}http://localhost:8001${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Backend:  ${YELLOW}tail -f /tmp/rocket-backend.log${NC}"
echo -e "  Frontend: ${YELLOW}tail -f /tmp/rocket-frontend.log${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📌 Important Notes:${NC}"
echo -e "  • Make sure your phone is on the same WiFi network"
echo -e "  • Some routers may block local network access"
echo -e "  • If it doesn't work, check your router's AP isolation settings"
echo ""
echo -e "${GREEN}To stop servers: ${YELLOW}./stop.sh${NC}"
echo ""

# Generate QR code if qrencode is available
if command -v qrencode >/dev/null 2>&1; then
    echo -e "${BLUE}📱 QR Code for easy access:${NC}"
    echo ""
    qrencode -t ANSIUTF8 "http://$LOCAL_IP:5173"
    echo ""
    echo -e "${YELLOW}Scan this QR code with your phone's camera!${NC}"
    echo ""
else
    echo -e "${YELLOW}💡 Tip: Install qrencode to get a QR code:${NC}"
    echo -e "   ${CYAN}sudo apt install qrencode${NC}"
    echo ""
fi

echo -e "${GREEN}Happy Gaming! 🚀${NC}"

