#!/bin/bash

echo "Starting Game-Env Autonomous Agent Framework..."

# Kill existing processes if any are running to ensure a clean start
echo "Cleaning up any old processes..."
kill $(lsof -t -i :8080) 2>/dev/null || true
kill $(lsof -t -i :3000) 2>/dev/null || true
pkill -f "python agents/points_agent.py" || true

# 1. Start Orchestrator Server
echo "1. Starting Node.js Orchestrator Server on ws://localhost:8080..."
node server/index.js > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# 2. Start Frontend Server
echo "2. Starting Frontend WebUI on http://localhost:3000..."
python3 -m http.server 3000 --directory frontend > frontend.log 2>&1 &
FRONTEND_PID=$!

# 3. Start Python Agent Supervisor
echo "3. Starting Python Agent Supervisor..."
python3 agents/points_agent.py > agent.log 2>&1 &
AGENT_PID=$!

echo ""
echo "========================================================"
echo "All components are running in the background."
echo "Access the End User View at: http://localhost:3000"
echo "Access the Engineer Game View at: http://localhost:3000/engineer.html"
echo ""
echo "To view logs, you can run:"
echo "tail -f server.log"
echo "tail -f agent.log"
echo ""
echo "To stop all services, run: ./stop.sh"
echo "========================================================"
