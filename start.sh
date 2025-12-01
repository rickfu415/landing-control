#!/bin/bash

# Rocket Landing Simulator - Start Script
# This script starts both backend and frontend servers

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Rocket Landing Simulator${NC}"
echo "================================"

# Kill existing processes
echo -e "${YELLOW}Stopping existing servers...${NC}"
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start Backend
echo -e "${YELLOW}Starting backend server...${NC}"
cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend in background
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8001 > /tmp/rocket-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Start Frontend
echo -e "${YELLOW}Starting frontend server...${NC}"
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Start frontend in background
nohup npm run dev > /tmp/rocket-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for servers to start
sleep 3

# Check if servers are running
echo ""
echo "================================"
echo -e "${GREEN}🎮 Servers Started!${NC}"
echo ""

# Get frontend port from log
FRONTEND_URL=$(grep -o "http://localhost:[0-9]*" /tmp/rocket-frontend.log 2>/dev/null | head -1)
if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL="http://localhost:5173"
fi

echo -e "  ${BLUE}Frontend:${NC} $FRONTEND_URL"
echo -e "  ${BLUE}Backend:${NC}  http://localhost:8001"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  Backend:  /tmp/rocket-backend.log"
echo "  Frontend: /tmp/rocket-frontend.log"
echo ""
echo -e "${GREEN}Open $FRONTEND_URL in your browser to play!${NC}"
echo ""
echo "Press Ctrl+C or run ./stop.sh to stop servers"

