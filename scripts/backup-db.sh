#!/bin/bash
set -e

BACKUP_DIR="/opt/syncwalk/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="syncwalk_${TIMESTAMP}.sql.gz"

docker-compose exec -T postgres pg_dump -U syncwalk syncwalk | gzip > "${BACKUP_DIR}/${FILENAME}"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete

echo "Backup created: ${FILENAME}"
