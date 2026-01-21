#!/bin/bash
set -e

# ===========================================
# Initial SSL Certificate Setup Script
# Run this ONCE when first deploying
# ===========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration - UPDATE THESE VALUES
DOMAIN="${DOMAIN:-yourdomain.com}"
EMAIL="${EMAIL:-your-email@example.com}"
STAGING="${STAGING:-0}" # Set to 1 for testing with Let's Encrypt staging

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   SSL Certificate Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Domain: ${YELLOW}$DOMAIN${NC}"
echo -e "Email: ${YELLOW}$EMAIL${NC}"

# Validate domain is set
if [ "$DOMAIN" = "yourdomain.com" ]; then
    echo -e "${RED}Error: Please set your domain!${NC}"
    echo "Usage: DOMAIN=yourdomain.com EMAIL=you@email.com ./init-ssl.sh"
    exit 1
fi

# Create directories
echo -e "\n${YELLOW}[1/5] Creating directories...${NC}"
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Create temporary nginx config for initial certificate
echo -e "\n${YELLOW}[2/5] Creating temporary nginx config...${NC}"
cat > ./nginx.temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Waiting for SSL setup...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start temporary nginx
echo -e "\n${YELLOW}[3/5] Starting temporary nginx...${NC}"
docker run -d --name nginx-temp \
    -p 80:80 \
    -v "$(pwd)/nginx.temp.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
    nginx:alpine

# Wait for nginx to start
sleep 5

# Set staging flag if needed
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    echo -e "${YELLOW}Using Let's Encrypt STAGING environment${NC}"
    STAGING_FLAG="--staging"
fi

# Request certificate
echo -e "\n${YELLOW}[4/5] Requesting SSL certificate...${NC}"
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop and remove temporary nginx
echo -e "\n${YELLOW}[5/5] Cleaning up...${NC}"
docker stop nginx-temp
docker rm nginx-temp
rm ./nginx.temp.conf

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   SSL Certificate Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nCertificates stored in: ./certbot/conf/"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Update nginx.conf with your domain (replace 'yourdomain.com')"
echo -e "2. Run: docker compose -f docker-compose.prod.yml up -d"
echo -e "\nTo test certificate renewal:"
echo -e "  docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run"
