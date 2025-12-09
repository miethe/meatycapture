#!/bin/bash
# ============================================================================
# MeatyCapture Docker Quick Start Script
# ============================================================================
#
# Automates the setup and launch of MeatyCapture Docker services.
#
# Usage:
#   ./docker-start.sh [command]
#
# Commands:
#   up      - Start services (default)
#   down    - Stop services
#   restart - Restart services
#   logs    - View logs
#   build   - Rebuild images
#   clean   - Clean up containers and images
#   status  - Show service status
#   help    - Show this help
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_success "Docker daemon is running"

    echo ""
}

# Setup environment
setup_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        echo -n "Create .env from .env.example? (y/n) "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            cp .env.example .env
            print_success "Created .env file"
            print_warning "Please review and configure .env before proceeding"
            echo ""
            exit 0
        else
            print_error "Cannot proceed without .env file"
            exit 1
        fi
    else
        print_success ".env file exists"
    fi
}

# Create data directory
create_data_dir() {
    if [ ! -d ./data ]; then
        mkdir -p ./data
        print_success "Created ./data directory"
    fi
}

# Start services
start_services() {
    print_header "Starting MeatyCapture Services"
    check_prerequisites
    setup_env
    create_data_dir

    echo "Building and starting services..."
    docker-compose up -d --build

    echo ""
    print_success "Services started successfully!"
    echo ""
    echo "Access the application:"
    echo "  Web App: http://localhost:${WEB_PORT:-80}"
    echo "  API Server: http://localhost:${PORT:-3001}"
    echo ""
    echo "View logs with: docker-compose logs -f"
    echo ""
}

# Stop services
stop_services() {
    print_header "Stopping MeatyCapture Services"
    docker-compose down
    print_success "Services stopped"
}

# Restart services
restart_services() {
    print_header "Restarting MeatyCapture Services"
    docker-compose restart
    print_success "Services restarted"
}

# View logs
view_logs() {
    print_header "Viewing Service Logs"
    echo "Press Ctrl+C to exit"
    echo ""
    docker-compose logs -f
}

# Build images
build_images() {
    print_header "Building Docker Images"
    docker-compose build --no-cache
    print_success "Images built successfully"
}

# Clean up
clean_up() {
    print_header "Cleaning Up Docker Resources"
    echo "This will remove:"
    echo "  - Stopped containers"
    echo "  - Unused images"
    echo "  - Unused networks"
    echo ""
    print_warning "Data in ./data will be preserved"
    echo ""
    echo -n "Continue? (y/n) "
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        docker-compose down
        docker image prune -a -f
        docker network prune -f
        print_success "Cleanup complete"
    else
        print_warning "Cleanup cancelled"
    fi
}

# Show status
show_status() {
    print_header "Service Status"
    docker-compose ps
    echo ""

    print_header "Service Health"
    echo "Web App:"
    if curl -sf http://localhost:${WEB_PORT:-80}/health > /dev/null 2>&1; then
        print_success "Web app is healthy"
    else
        print_error "Web app is not responding"
    fi

    echo "API Server:"
    if curl -sf http://localhost:${PORT:-3001}/health > /dev/null 2>&1; then
        print_success "API server is healthy"
    else
        print_error "API server is not responding"
    fi
    echo ""
}

# Show help
show_help() {
    cat << EOF
MeatyCapture Docker Quick Start Script

Usage: ./docker-start.sh [command]

Commands:
  up        Start services (default)
  down      Stop services
  restart   Restart services
  logs      View logs (follow mode)
  build     Rebuild images from scratch
  clean     Clean up Docker resources
  status    Show service status and health
  help      Show this help message

Examples:
  ./docker-start.sh              # Start services
  ./docker-start.sh up           # Start services
  ./docker-start.sh logs         # View logs
  ./docker-start.sh status       # Check health

Environment Variables (from .env):
  WEB_PORT                 Web app port (default: 80)
  PORT                     API server port (default: 3001)
  MEATYCAPTURE_DATA_DIR    Data directory (default: /data)

For more information, see DOCKER.md
EOF
}

# Main command handler
COMMAND=${1:-up}

case $COMMAND in
    up|start)
        start_services
        ;;
    down|stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs
        ;;
    build)
        build_images
        ;;
    clean)
        clean_up
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
