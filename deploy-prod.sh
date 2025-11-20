#!/bin/bash

# Production Deployment Script for Pinterest Automation

set -e

echo "🚀 Starting production deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.prod to .env and configure your production values."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📦 Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

echo "🗄️ Syncing database schema..."
docker compose -f docker-compose.prod.yml run --rm app npx prisma@6 db push --accept-data-loss

echo "🌱 Seeding database with initial data..."
docker compose -f docker-compose.prod.yml run --rm app npm run prisma:seed || echo "⚠️ Seed already exists or failed (this is normal if database is already seeded)"

echo "🚀 Starting containers..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for application to be ready..."
sleep 10

echo "🔍 Checking application health..."
if curl -f http://localhost:${PORT:-3333} > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access at: ${NEXTAUTH_URL}"
else
    echo "⚠️ Application may not be responding yet. Check logs with:"
    echo "   docker compose -f docker-compose.prod.yml logs -f app"
fi

echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart"
echo ""
echo "✨ Deployment complete!"
