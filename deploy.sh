#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Noted Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration
APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="docker-compose.prod.yml"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Pull latest changes
echo -e "\n${YELLOW}[1/6] Pulling latest changes from ${BRANCH}...${NC}"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found${NC}"
    echo "Please create .env.production with your production environment variables"
    exit 1
fi

# Build images
echo -e "\n${YELLOW}[2/6] Building Docker images...${NC}"
docker compose -f $COMPOSE_FILE build --no-cache

# Stop existing containers
echo -e "\n${YELLOW}[3/6] Stopping existing containers...${NC}"
docker compose -f $COMPOSE_FILE down

# Start containers
echo -e "\n${YELLOW}[4/6] Starting containers...${NC}"
docker compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "\n${YELLOW}[5/6] Waiting for services to be healthy...${NC}"
sleep 10

# Check if postgres is ready
echo "Waiting for PostgreSQL..."
until docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}PostgreSQL is ready${NC}"

# Run database migrations
echo -e "\n${YELLOW}[6/6] Running database migrations...${NC}"
docker compose -f $COMPOSE_FILE exec -T web npx drizzle-kit push || {
    echo -e "${YELLOW}Migration command failed, trying alternative...${NC}"
    docker compose -f $COMPOSE_FILE exec -T web npm run db:push 2>/dev/null || true
}

# Clean up old images
echo -e "\n${YELLOW}Cleaning up old Docker images...${NC}"
docker image prune -f

# Show status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nContainer Status:"
docker compose -f $COMPOSE_FILE ps

echo -e "\n${GREEN}Application should be available at your domain${NC}"
echo -e "To view logs: docker compose -f $COMPOSE_FILE logs -f"
