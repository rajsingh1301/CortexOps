#!/bin/bash
# ============================================================
# CortexOps — One-Command Launcher
# Starts all 3 services: go-agent, node-orchestrator, frontend
# Usage: ./start.sh
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       🧠 CortexOps — Starting Up         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- 1. Node Orchestrator (port 4000) ---
echo -e "${YELLOW}▸ Starting node-orchestrator on :4000...${NC}"
cd "$ROOT_DIR/node-orchestrator"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing dependencies..."
  npm install --silent
fi
npm run dev &
NODE_PID=$!
echo -e "${GREEN}  ✓ node-orchestrator PID: $NODE_PID${NC}"

# --- 2. Go Agent (port 5005) ---
echo -e "${YELLOW}▸ Starting go-agent on :5005...${NC}"
cd "$ROOT_DIR/go-agent"
export $(grep -v '^#' .env | xargs)
go run . &
GO_PID=$!
echo -e "${GREEN}  ✓ go-agent PID: $GO_PID${NC}"

# --- 3. Frontend (port 5173) ---
echo -e "${YELLOW}▸ Starting frontend on :5173...${NC}"
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing dependencies..."
  npm install --silent
fi
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}  ✓ frontend PID: $FRONTEND_PID${NC}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🚀 All services running!                ║${NC}"
echo -e "${CYAN}║                                          ║${NC}"
echo -e "${CYAN}║  Dashboard:    http://localhost:5173      ║${NC}"
echo -e "${CYAN}║  API:          http://localhost:4000      ║${NC}"
echo -e "${CYAN}║  Go Agent:     http://localhost:5005      ║${NC}"
echo -e "${CYAN}║                                          ║${NC}"
echo -e "${CYAN}║  Press Ctrl+C to stop all services       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

# Trap Ctrl+C to kill all background processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down all services...${NC}"
  kill $NODE_PID $GO_PID $FRONTEND_PID 2>/dev/null
  wait $NODE_PID $GO_PID $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait
