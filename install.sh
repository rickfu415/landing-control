#!/bin/bash

# Rocket Landing Simulator - Installation Script for Aliyun Server
# This script installs all required dependencies for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rocket Landing Simulator - Installation  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}⚠️  Please do not run this script as root${NC}"
    echo "Run it as a regular user with sudo privileges"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print step
print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Detect OS
print_step "Detecting Operating System"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    print_success "Detected: $PRETTY_NAME"
else
    print_error "Cannot detect OS"
    exit 1
fi

# Update system packages
print_step "Updating System Packages"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt update
    print_success "Package list updated"
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "alios" ]; then
    sudo yum update -y
    print_success "Package list updated"
elif [ "$OS" = "alinux" ]; then
    sudo yum update -y
    print_success "Package list updated"
else
    print_warning "Unknown OS, attempting with apt..."
    sudo apt update || sudo yum update -y
fi

# Install Python 3.8+
print_step "Installing Python 3"
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_success "Python 3 already installed: $(python3 --version)"
else
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y python3 python3-pip python3-venv
    else
        sudo yum install -y python3 python3-pip
    fi
    print_success "Python 3 installed: $(python3 --version)"
fi

# Install pip if not present
if ! command_exists pip3; then
    print_step "Installing pip3"
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y python3-pip
    else
        sudo yum install -y python3-pip
    fi
    print_success "pip3 installed"
fi

# Install Node.js and npm
print_step "Installing Node.js and npm"
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
else
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Install Node.js 18.x LTS
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        # For CentOS/RHEL/Aliyun
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    print_success "Node.js installed: $(node --version)"
fi

# Verify npm
if command_exists npm; then
    print_success "npm installed: $(npm --version)"
else
    print_error "npm installation failed"
    exit 1
fi

# Install build essentials (needed for some Python packages)
print_step "Installing Build Tools"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt install -y build-essential python3-dev
    print_success "Build tools installed"
else
    sudo yum groupinstall -y "Development Tools"
    sudo yum install -y python3-devel
    print_success "Build tools installed"
fi

# Install Git (if not present)
print_step "Checking Git"
if command_exists git; then
    print_success "Git already installed: $(git --version)"
else
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y git
    else
        sudo yum install -y git
    fi
    print_success "Git installed: $(git --version)"
fi

# Get project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Setup Backend
print_step "Setting up Backend (Python)"
cd "$BACKEND_DIR"

# Remove old venv if exists
if [ -d "venv" ]; then
    print_warning "Removing old virtual environment..."
    rm -rf venv
fi

# Create virtual environment
print_success "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
print_success "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
print_success "Installing Python packages from requirements.txt..."
pip install -r requirements.txt

print_success "Backend dependencies installed"
deactivate

# Setup Frontend
print_step "Setting up Frontend (Node.js)"
cd "$FRONTEND_DIR"

# Remove old node_modules if exists
if [ -d "node_modules" ]; then
    print_warning "Removing old node_modules..."
    rm -rf node_modules
fi

# Install npm dependencies
print_success "Installing npm packages from package.json..."
npm install

print_success "Frontend dependencies installed"

# Install PM2 for process management (optional but recommended for production)
print_step "Installing PM2 Process Manager (Optional)"
if command_exists pm2; then
    print_success "PM2 already installed: $(pm2 --version)"
else
    sudo npm install -g pm2
    print_success "PM2 installed globally"
fi

# Install Nginx (optional, for reverse proxy)
print_step "Checking Nginx (Optional)"
if command_exists nginx; then
    print_success "Nginx already installed: $(nginx -v 2>&1)"
else
    read -p "Do you want to install Nginx for reverse proxy? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt install -y nginx
        else
            sudo yum install -y nginx
        fi
        print_success "Nginx installed"
    else
        print_warning "Skipping Nginx installation"
    fi
fi

# Create systemd service files (optional)
print_step "System Configuration"
read -p "Do you want to create systemd service files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backend service
    sudo tee /etc/systemd/system/rocket-backend.service > /dev/null <<EOF
[Unit]
Description=Rocket Landing Simulator Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
ExecStart=$BACKEND_DIR/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    print_success "Backend service file created: /etc/systemd/system/rocket-backend.service"
    
    # Frontend service (using npm run build + serve)
    sudo tee /etc/systemd/system/rocket-frontend.service > /dev/null <<EOF
[Unit]
Description=Rocket Landing Simulator Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$FRONTEND_DIR
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    print_success "Frontend service file created: /etc/systemd/system/rocket-frontend.service"
    
    sudo systemctl daemon-reload
    print_success "Systemd daemon reloaded"
    
    echo ""
    echo "To enable and start services:"
    echo "  sudo systemctl enable rocket-backend"
    echo "  sudo systemctl enable rocket-frontend"
    echo "  sudo systemctl start rocket-backend"
    echo "  sudo systemctl start rocket-frontend"
else
    print_warning "Skipping systemd service creation"
fi

# Configure firewall
print_step "Firewall Configuration"
if command_exists ufw; then
    read -p "Do you want to configure UFW firewall? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw allow 8001/tcp comment 'Rocket Backend'
        sudo ufw allow 5173/tcp comment 'Rocket Frontend'
        print_success "Firewall rules added for ports 8001 and 5173"
    fi
elif command_exists firewall-cmd; then
    read -p "Do you want to configure firewalld? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo firewall-cmd --permanent --add-port=8001/tcp
        sudo firewall-cmd --permanent --add-port=5173/tcp
        sudo firewall-cmd --reload
        print_success "Firewall rules added for ports 8001 and 5173"
    fi
else
    print_warning "No firewall detected. Make sure ports 8001 and 5173 are accessible."
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Installation Complete! 🚀         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Installed Components:${NC}"
echo "  ✓ Python $(python3 --version | cut -d' ' -f2)"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ npm $(npm --version)"
echo "  ✓ Backend dependencies (FastAPI, uvicorn, etc.)"
echo "  ✓ Frontend dependencies (React, Three.js, etc.)"
if command_exists pm2; then
    echo "  ✓ PM2 Process Manager"
fi
if command_exists nginx; then
    echo "  ✓ Nginx"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Start the application:"
echo "     ${YELLOW}./start.sh${NC}"
echo ""
echo "  2. Or use systemd services (if configured):"
echo "     ${YELLOW}sudo systemctl start rocket-backend${NC}"
echo "     ${YELLOW}sudo systemctl start rocket-frontend${NC}"
echo ""
echo "  3. Access the application:"
echo "     Frontend: ${YELLOW}http://your-server-ip:5173${NC}"
echo "     Backend:  ${YELLOW}http://your-server-ip:8001${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  Check backend logs:  ${YELLOW}tail -f /tmp/rocket-backend.log${NC}"
echo "  Check frontend logs: ${YELLOW}tail -f /tmp/rocket-frontend.log${NC}"
echo "  Stop servers:        ${YELLOW}./stop.sh${NC}"
echo ""
echo -e "${YELLOW}Note: For production deployment, consider:${NC}"
echo "  - Building frontend for production: ${YELLOW}cd frontend && npm run build${NC}"
echo "  - Using Nginx as reverse proxy"
echo "  - Setting up SSL/TLS certificates"
echo "  - Configuring proper security groups on Aliyun"
echo ""
print_success "Installation script completed successfully!"

