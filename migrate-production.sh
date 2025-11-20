#!/bin/bash

echo "🔄 Applying database migrations to production..."

# Run migration inside the app container
docker-compose -f docker-compose.prod.yml exec app npx prisma db push

echo "✅ Migration completed!"
