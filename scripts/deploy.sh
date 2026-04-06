#!/bin/bash
set -e

cd /opt/syncwalk
git pull origin main
docker-compose build --no-cache api nextjs
docker-compose up -d
docker-compose exec -T api alembic upgrade head
docker image prune -f

echo "Deployed at $(date)"
