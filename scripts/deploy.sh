#!/usr/bin/env bash
set -euo pipefail

echo "🚀 FerrazTech - Deploy"

cd /opt/ferraztech

# Pull latest
git pull origin main

# Build e restart
docker compose --profile production build
docker compose --profile production up -d

# Cleanup
docker image prune -f

echo "✅ Deploy concluído"
