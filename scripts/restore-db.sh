#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-db.sh <backup_file.sql.gz>"
    exit 1
fi

echo "Restoring from: $1"
gunzip -c "$1" | docker-compose exec -T postgres psql -U syncwalk -d syncwalk

echo "Restore complete"
