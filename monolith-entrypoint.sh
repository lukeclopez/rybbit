#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npm run db:push -- --force

# Start Next.js standalone server in background on internal port
echo "Starting Next.js server on port 3002..."
HOSTNAME=127.0.0.1 PORT=3002 node /app/client/server.js &
NEXT_PID=$!

# Handle graceful shutdown
trap "echo 'Shutting down...'; kill $NEXT_PID 2>/dev/null; exit 0" TERM INT

echo "Starting Fastify API server on port ${PORT:-3000}..."
exec "$@"
