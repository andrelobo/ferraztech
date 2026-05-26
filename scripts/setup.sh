#!/usr/bin/env bash
set -euo pipefail

echo "🚀 FerrazTech - Setup VPS"

# Docker
if ! command -v docker &>/dev/null; then
  echo "Instalando Docker..."
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose-v2
  sudo systemctl enable docker
fi

# UFW
echo "Configurando firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Diretório do projeto
sudo mkdir -p /opt/ferraztech
sudo chown "$USER:$USER" /opt/ferraztech

# Clone
if [ ! -d /opt/ferraztech/.git ]; then
  git clone https://github.com/andrelobo/ferraztech.git /opt/ferraztech
fi

echo "✅ Setup concluído. Crie o .env e rode 'docker compose --profile production up -d'"
