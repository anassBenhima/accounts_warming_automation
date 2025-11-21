#!/bin/bash

# Safe Production Update Script
# Use this for updates to avoid data loss

set -e

echo "🔄 Starting safe production update..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Pull latest code (if not already done)
echo "📥 Checking for latest code..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    git pull origin main || echo "⚠️ Already up to date or not a git repo"
fi

# Build new Docker image
echo "📦 Building new Docker image..."
docker compose -f docker-compose.prod.yml build app

# Apply database migrations safely (WITHOUT --accept-data-loss)
echo "🗄️ Applying database schema updates..."
echo "⚠️ This will ADD new columns but will NOT drop existing data"
docker compose -f docker-compose.prod.yml run --rm app npm run prisma:push

# Run seed to create new users (will skip if they already exist)
echo "🌱 Creating new users (if they don't exist)..."
docker compose -f docker-compose.prod.yml run --rm app npm run prisma:seed

# Restart the application with new code
echo "🔄 Restarting application with new code..."
docker compose -f docker-compose.prod.yml up -d --force-recreate app

echo "⏳ Waiting for application to stabilize..."
sleep 15

# Check health
echo "🔍 Checking application health..."
if curl -f http://localhost:${PORT:-3333} > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
else
    echo "⚠️ Application may not be responding yet. Checking logs..."
    docker compose -f docker-compose.prod.yml logs --tail=50 app
fi

echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📝 View logs with:"
echo "   docker compose -f docker-compose.prod.yml logs -f app"

echo ""
echo "✨ Update complete!"
echo ""
echo "🔐 User accounts available:"
echo "   - admin@flexiglob.com (password: admin@123@admin) - ADMIN role"
echo "   - yassir@flexiglob.com (password: flexiglob@2025) - USER role"
echo "   - mohamed@flexiglob.com (password: flexiglob@2025) - USER role"
echo "   - abdoulbari@flexiglob.com (password: flexiglob@2025) - USER role"
