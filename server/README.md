# Orchestrator Server

This directory will contain the central Node.js or FastAPI server.

## Responsibilities
- Manage WebSocket connections to the frontend.
- Maintain the state of active agents.
- Expose an API for agents to emit events (`SPAWN`, `THINKING`, `TOOL_CALL`, `COMPLETE`).
- Broadcast agent events to the visualization frontend.
