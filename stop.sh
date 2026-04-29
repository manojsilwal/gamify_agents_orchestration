#!/bin/bash
echo "Stopping Game-Env Autonomous Agent Framework..."
kill $(lsof -t -i :8080) 2>/dev/null || true
kill $(lsof -t -i :5173) 2>/dev/null || true
pkill -f "python agents/points_agent.py" || true
pkill -f "node index.js" || true
pkill -f "vite" || true
echo "All processes stopped."
