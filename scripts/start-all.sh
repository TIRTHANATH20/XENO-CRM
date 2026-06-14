#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

info() {
  echo -e "${GREEN}$*${NC}"
}

warn() {
  echo -e "${YELLOW}$*${NC}"
}

error() {
  echo -e "${RED}$*${NC}" >&2
}

find_free_port() {
  local port=$1
  local max=${2:-3010}

  while [ "$port" -le "$max" ]; do
    if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done

  return 1
}

wait_for_port() {
  local port=$1
  local timeout=${2:-20}
  local elapsed=0

  while ! nc -z 127.0.0.1 "$port" >/dev/null 2>&1; do
    if [ "$elapsed" -ge "$timeout" ]; then
      return 1
    fi
    sleep 0.5
    elapsed=$((elapsed + 1))
  done
}

install_deps() {
  local dir="$1"
  local label="$2"
  local cmd="$3"

  if [ ! -f "$dir/.deps_installed" ]; then
    warn "Installing dependencies for $label..."
    (cd "$dir" && eval "$cmd")
    touch "$dir/.deps_installed"
  else
    info "Dependencies already installed for $label."
  fi
}

cleanup() {
  error "Stopping services..."
  kill "${BACKEND_PID:-}" "${CHANNEL_PID:-}" "${AGENTS_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT

info "Starting all Xeno services..."
warn "Note: Each service will run in the background"

warn "Killing existing processes on ports 8001-8003, 3000, and 3001..."
lsof -ti:8001,8002,8003,3000,3001 | xargs kill -9 2>/dev/null || true
sleep 1
rm -rf frontend/.next/dev

install_deps "backend" "backend" "python3 -m pip install -r requirements.txt"
install_deps "channel-service" "channel service" "python3 -m pip install -r requirements.txt"
install_deps "agents" "agents service" "python3 -m pip install -r requirements.txt"

if [ ! -d "frontend/node_modules" ]; then
  warn "Installing frontend dependencies..."
  (cd frontend && npm install)
else
  info "Frontend dependencies already installed."
fi

BACKEND_PORT=8001
CHANNEL_PORT=8002
AGENTS_PORT=8003
FRONTEND_PORT="$(find_free_port 3000 3010 || echo 3001)"

info "[1/4] Starting Backend (port $BACKEND_PORT)..."
(cd backend && python3 -m uvicorn app.main:app --reload --port "$BACKEND_PORT") &
BACKEND_PID=$!
info "Backend PID: $BACKEND_PID"

info "[2/4] Starting Channel Service (port $CHANNEL_PORT)..."
(cd channel-service && python3 -m uvicorn app.main:app --reload --port "$CHANNEL_PORT") &
CHANNEL_PID=$!
info "Channel Service PID: $CHANNEL_PID"

info "[3/4] Starting Agents Service (port $AGENTS_PORT)..."
(PYTHONPATH=. python3 -m uvicorn agents.api:app --reload --port "$AGENTS_PORT") &
AGENTS_PID=$!
info "Agents Service PID: $AGENTS_PID"

warn "Waiting for backend services to become ready..."
wait_for_port "$BACKEND_PORT" 20
wait_for_port "$CHANNEL_PORT" 20
wait_for_port "$AGENTS_PORT" 20

info "[4/4] Starting Frontend on port $FRONTEND_PORT..."
(cd frontend && npm run dev -- --hostname 127.0.0.1 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!
info "Frontend PID: $FRONTEND_PID"

if ! wait_for_port "$FRONTEND_PORT" 20; then
  error "Frontend did not become ready on port $FRONTEND_PORT."
  exit 1
fi

info "All services started!"
echo "  Backend:       http://localhost:$BACKEND_PORT"
echo "  Channel:       http://localhost:$CHANNEL_PORT"
echo "  Agents:        http://localhost:$AGENTS_PORT"
echo "  Frontend:      http://localhost:$FRONTEND_PORT"
echo "To stop all services, run: kill $BACKEND_PID $CHANNEL_PID $AGENTS_PID $FRONTEND_PID"

wait
