#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"
git pull origin main
docker compose build --no-cache api nextjs
docker compose up -d
docker compose exec -T api alembic upgrade head
docker image prune -f

echo "Deployed at $(date)"
