#!/bin/bash

echo "Starting Game-Env Autonomous Agent Framework (Upgraded to React SPA)..."

# Kill existing processes if any are running to ensure a clean start
echo "Cleaning up any old processes..."
kill -9 $(lsof -t -i :8080) 2>/dev/null || true
kill -9 $(lsof -t -i :5173) 2>/dev/null || true
pkill -9 -f "node server/index.js" || true
pkill -9 -f "python agents/points_agent.py" || true
pkill -9 -f "python3 agents/points_agent.py" || true

# 1. Start Orchestrator Server
echo "1. Starting Node.js Orchestrator Server on ws://localhost:8080..."
cd server && npm install > /dev/null 2>&1
node index.js > ../server.log 2>&1 &
cd ..
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# 2. Start Frontend Server
echo "2. Starting Frontend WebUI (Vite React) on http://localhost:5173..."
cd frontend && npm install > /dev/null 2>&1
npm run dev -- --port 5173 > ../frontend.log 2>&1 &
cd ..
FRONTEND_PID=$!

# 3. Start Python Agent Supervisor
echo "3. Starting Python Agent Supervisor..."
pip install -r agents/requirements.txt > /dev/null 2>&1
python3 agents/points_agent.py > agent.log 2>&1 &
AGENT_PID=$!

echo ""
echo "========================================================"
echo "All components are running in the background."
echo "Access the Application at: http://localhost:5173"
echo ""
echo "To view logs, you can run:"
echo "tail -f server.log"
echo "tail -f agent.log"
echo "tail -f frontend.log"
echo ""
echo "To stop all services, run: ./stop.sh"
echo "========================================================"
