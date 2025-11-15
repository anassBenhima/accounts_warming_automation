#!/bin/sh
# Initialization script to ensure upload directories exist with proper permissions

echo "Initializing upload directories..."

# Create directories if they don't exist
mkdir -p /app/public/uploads
mkdir -p /app/public/generated

# Set proper permissions (nextjs user owns them)
chown -R nextjs:nodejs /app/public/uploads /app/public/generated
chmod -R 755 /app/public/uploads /app/public/generated

echo "Upload directories initialized successfully"

# Start the Next.js application as nextjs user
exec su -s /bin/sh nextjs -c "cd /app && exec node server.js"
