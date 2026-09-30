#!/bin/sh
set -e

# Ensure required directories exist
mkdir -p /app/data /app/uploads/kop-surat /var/log/nginx /var/run/nginx

# Add local node_modules binaries to PATH
export PATH="/app/apps/api/node_modules/.bin:/app/node_modules/.bin:$PATH"

# Ensure database schema is up-to-date in persistent volume
echo "==> Initializing / updating SQLite database schema..."
if [ -f "/app/apps/api/node_modules/.bin/prisma" ]; then
    /app/apps/api/node_modules/.bin/prisma db push --schema=/app/apps/api/prisma/schema.prisma --accept-data-loss
elif [ -f "/app/node_modules/.bin/prisma" ]; then
    /app/node_modules/.bin/prisma db push --schema=/app/apps/api/prisma/schema.prisma --accept-data-loss
fi

# Start NestJS API
echo "==> Starting NestJS API backend on port 3000..."
cd /app && node apps/api/dist/main.js &
API_PID=$!

# Graceful termination handler
cleanup() {
    echo "==> Shutting down services gracefully..."
    kill -TERM "$API_PID" 2>/dev/null || true
    nginx -s quit 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Brief delay to allow API socket binding
sleep 2

# Start Nginx
echo "==> Starting Nginx frontend web server on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

wait -n "$API_PID" "$NGINX_PID"
cleanup
