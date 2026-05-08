#!/usr/bin/env bash
# =============================================================================
# gcp-setup.sh — One-shot bootstrap for zenith-rewards on a GCP Debian 12 VM
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/manojsilwal/gamify_agents_orchestration.git}"
REPO_DIR="${HOME}/gamify_agents_orchestration"
APP_DIR="${REPO_DIR}/zenith-rewards"

step() { echo -e "\n\033[1;36m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠ $*\033[0m"; }

step "1/5 System update"
sudo apt-get update -qq && sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq curl git ca-certificates gnupg lsb-release
ok "System updated"

step "2/5 Docker install"
if ! command -v docker &>/dev/null; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  ok "Docker installed"
else
  ok "Docker already present — skipping"
fi

step "3/5 Validate repo"
if [ ! -d "$REPO_DIR" ]; then
  warn "gamify_agents_orchestration repository not found at $REPO_DIR. Cloning now..."
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$APP_DIR"
ok "Repo ready at $APP_DIR"

step "4/5 Configure secrets"
if [ ! -f .env.gcp ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.gcp
  else
    touch .env.gcp
  fi
  warn "Action Required: Fill in the secrets in .env.gcp:"
  warn "  nano $APP_DIR/.env.gcp"
else
  ok ".env.gcp already exists — skipping"
fi

step "5/5 Start services"
sg docker -c "docker compose -f docker-compose.gcp.yml up -d --build"

echo ""
ok "zenith-rewards started."
echo "  Web Frontend → http://localhost:5173"
echo "  API Backend  → http://localhost:8000"
echo "  Worker API   → http://localhost:8001"
