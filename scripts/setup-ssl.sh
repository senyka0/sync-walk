#!/bin/bash
set -e

DOMAIN=${1:-"sync-walk.sbs"}
EMAIL=${2:-"admin@sync-walk.sbs"}
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

NGINX_WAS_RUNNING=0
if docker compose ps --status running nginx >/dev/null 2>&1; then
    NGINX_WAS_RUNNING=1
    docker compose stop nginx
fi

docker run --rm \
    --network host \
    -v /opt/sync-walk/certbot/conf:/etc/letsencrypt \
    -v /opt/sync-walk/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email

echo "SSL certificates obtained for $DOMAIN"
if [ "$NGINX_WAS_RUNNING" -eq 1 ]; then
    docker compose start nginx
    echo "Nginx restarted"
else
    echo "Start nginx with: docker compose up -d nginx"
fi
