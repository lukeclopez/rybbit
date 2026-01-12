# syntax=docker/dockerfile:1

# --------------------------------------------------------
# 1. BUILDER STAGE (Use Node 23)
# --------------------------------------------------------
FROM node:23-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python-is-python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and build shared package
COPY shared ./shared
WORKDIR /app/shared
# Safety: remove local modules if they slipped in
RUN rm -rf node_modules 
RUN npm install && npm run build

# Setup Server
WORKDIR /app/server
COPY server/ .
RUN rm -rf node_modules
RUN npm ci

# Build the application
RUN npm run build

# --------------------------------------------------------
# 2. RUNTIME STAGE (Use Node 23)
# --------------------------------------------------------
FROM node:23-slim

WORKDIR /app

# FIX: Install 'python-is-python3' so node-gyp finds 'python'
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    ca-certificates \
    python3 \
    python-is-python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy artifacts
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/GeoLite2-City.mmdb ./GeoLite2-City.mmdb
COPY --from=builder /app/server/dist ./dist
# We copy the node_modules, but the entrypoint might rebuild them
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=builder /app/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/src ./src
COPY --from=builder /app/shared ./shared

RUN chmod +x /docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]