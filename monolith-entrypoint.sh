#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npm run db:push -- --force

# Start Next.js standalone server in background on internal port
echo "Starting Next.js server on port 3002..."
HOSTNAME=127.0.0.1 PORT=3002 node /app/client/server.js &
NEXT_PID=$!

# Wait for Next.js to be ready
echo "Waiting for Next.js to start..."
for i in $(seq 1 30); do
    if wget -q --spider http://127.0.0.1:3002 2>/dev/null; then
        echo "Next.js is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Warning: Next.js health check timed out, continuing anyway..."
    fi
    sleep 1
done

# Handle graceful shutdown
trap "echo 'Shutting down...'; kill $NEXT_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Start Fastify (main process)
echo "Starting Fastify API server on port ${PORT:-3000}..."
exec "$@"
