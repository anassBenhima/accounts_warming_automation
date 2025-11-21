# Deployment Guide

## Quick Update (Safe for Production)

Use this for regular updates when you pull new code:

```bash
# 1. Pull latest code
git pull origin main

# 2. Run the safe update script
./update-prod.sh
```

This script will:
- Build the new Docker image
- Apply database schema changes **safely** (adds new columns, preserves data)
- Create new users (if they don't exist)
- Restart the application with zero data loss

## Initial Deployment

For the first time setup:

```bash
./deploy-prod.sh
```

## Database Backup

**IMPORTANT**: Always backup before major updates:

```bash
# Create a backup
./backup-db.sh

# Backups are stored in ./backups/
# Only the last 7 backups are kept automatically
```

## Manual Database Operations

### Apply schema changes only
```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma db push
```

### Run seed (create users)
```bash
docker compose -f docker-compose.prod.yml run --rm app node prisma/seed.js
```

### View database
```bash
# Open Prisma Studio
docker compose -f docker-compose.prod.yml run --rm -p 5555:5555 app npx prisma studio
```

## Useful Commands

### View logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Only app
docker compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

### Restart services
```bash
# Restart app only
docker compose -f docker-compose.prod.yml restart app

# Restart all
docker compose -f docker-compose.prod.yml restart
```

### Check status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Start everything
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Database Restore

If you need to restore from a backup:

```bash
# 1. Stop the app
docker compose -f docker-compose.prod.yml stop app

# 2. Restore the backup
gunzip -c backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql \
  -U postgres -d pinterest_automation

# 3. Start the app
docker compose -f docker-compose.prod.yml start app
```

## User Accounts

After running the update, these accounts are available:

### Admin Account
- Email: `admin@gmail.com`
- Password: `admin@123@blogging`
- Role: ADMIN (can manage users, see all data)

### Team Accounts
- Email: `yassir@flexiglob.com` | Password: `flexiglob@2025` | Role: USER
- Email: `mohamed@flexiglob.com` | Password: `flexiglob@2025` | Role: USER
- Email: `abdoulbari@flexiglob.com` | Password: `flexiglob@2025` | Role: USER

## Troubleshooting

### App won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs app

# Check database connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Database migration issues
```bash
# Check current schema
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pinterest_automation -c "\d users"

# Force schema sync (CAUTION: may lose data if schema conflicts exist)
docker compose -f docker-compose.prod.yml run --rm app npx prisma db push --accept-data-loss
```

### Clear Redis cache
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

## Monitoring

### Check disk space
```bash
# Check volume sizes
docker system df -v

# Check database size
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d pinterest_automation -c "SELECT pg_size_pretty(pg_database_size('pinterest_automation'));"
```

### Check running processes
```bash
docker compose -f docker-compose.prod.yml exec app ps aux
```

## Data Persistence

Your data is safe in these Docker volumes:
- `postgres_data` - All database data
- `redis_data` - Redis cache
- `./public/uploads` - Uploaded images
- `./public/generated` - Generated images

These volumes persist even when containers are removed.
