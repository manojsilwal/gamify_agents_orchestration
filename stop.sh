#!/bin/bash
echo "Stopping Game-Env Autonomous Agent Framework..."
kill $(lsof -t -i :8080) 2>/dev/null || true
kill $(lsof -t -i :3000) 2>/dev/null || true
pkill -f "python3 agents/points_agent.py" || true
echo "All services stopped."
