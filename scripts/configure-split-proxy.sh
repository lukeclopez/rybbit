#!/bin/bash
# Deploy client to Dokku and configure nginx proxy for /api routes.
# This way, both the client and server can use the same domain.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

DOKKU_HOST=""
SSH_USER=""
APP_NAME=""
NGINX_CONF_SOURCE="$REPO_ROOT/client/nginx.conf.d/api-proxy.conf"
NGINX_CONF_DEST="/home/dokku/$APP_NAME/nginx.conf.d/api-proxy.conf"

echo "==> Deploying to Dokku..."
git push dokku-client master

echo "==> Copying nginx config for /api proxy..."

# Ensure the directory exists
ssh ${SSH_USER}@${DOKKU_HOST} "sudo mkdir -p /home/dokku/$APP_NAME/nginx.conf.d/"

# Copy the nginx config file
scp "$NGINX_CONF_SOURCE" ${SSH_USER}@${DOKKU_HOST}:/tmp/api-proxy.conf

# Move to final location with correct ownership and rebuild nginx
ssh ${SSH_USER}@${DOKKU_HOST} "sudo mv /tmp/api-proxy.conf $NGINX_CONF_DEST && sudo chown dokku:dokku $NGINX_CONF_DEST && dokku proxy:build-config $APP_NAME"

echo "==> Deployment complete!"
echo "==> Verify with: curl -I https://<URL>/api/health"
