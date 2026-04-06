#!/bin/bash
set -e

DOMAIN=${1:-"syncwalk.com"}
EMAIL=${2:-"admin@syncwalk.com"}

docker run --rm \
    -v /opt/sync-walk/certbot/conf:/etc/letsencrypt \
    -v /opt/sync-walk/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    -d "$DOMAIN" \
    -d "api.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email

echo "SSL certificates obtained for $DOMAIN"
echo "Now copy nginx/conf.d/ssl.conf.example to nginx/conf.d/ssl.conf and restart nginx"
