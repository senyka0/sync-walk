#!/bin/bash
set -e

DOMAIN=${1:-"sync-walk.sbs"}
EMAIL=${2:-"admin@sync-walk.sbs"}

docker run --rm \
    -v /opt/sync-walk/certbot/conf:/etc/letsencrypt \
    -v /opt/sync-walk/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email

echo "SSL certificates obtained for $DOMAIN"
echo "Restart nginx to apply the new certificate"
