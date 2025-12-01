#!/bin/bash

# Rocket Landing Simulator - Stop Script
# This script stops all running servers

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Rocket Landing Simulator servers...${NC}"

# Kill backend
if pkill -f "uvicorn main:app" 2>/dev/null; then
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}Backend was not running${NC}"
fi

# Kill frontend
if pkill -f "vite" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}Frontend was not running${NC}"
fi

echo -e "${GREEN}All servers stopped.${NC}"

