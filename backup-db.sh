#!/bin/bash

# Database Backup Script
# Creates a backup of the PostgreSQL database

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "💾 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create backup using docker exec
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-pinterest_automation} \
    > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "📊 Backup size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
ls -t $BACKUP_DIR/db_backup_*.sql.gz | tail -n +8 | xargs -r rm

echo "✨ Backup complete!"
