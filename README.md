# Game-Env Autonomous Agent Framework

This repository is a blueprint and foundation for building a "Game-Environment" autonomous agent framework, inspired by tools like AgentCraft.

## Concept

The goal is to create an environment where AI agents act autonomously to achieve high-level company or app goals, while their actions are visualized in real-time through a dynamic WebUI or Game Engine (like an RTS game).

Instead of "Instruct-and-Wait", this framework relies on **Goal-Oriented Autonomy**.

## Architecture Overview

The framework is decoupled into three main layers:

1. **The Game Engine / WebUI (Frontend):** A dynamic interface (React/Three.js) that listens to events and visualizes the agent's state, tools, and progress in real-time.
2. **The Orchestrator (Server):** A local server (Node.js/Python) that manages state, maintains the WebSocket connection to the frontend, and acts as the central hub.
3. **The Agents & Hooks:** The AI loop (ReAct) where agents observe, reason, and act. They emit standardized events to the Orchestrator.

For a deep dive into the architecture, the concept of "Generative UI", and how to keep agents strictly aligned to the "Soul" of the project, please read `ARCHITECTURE.md`.

## Project Structure

```text
.
├── ARCHITECTURE.md     # Detailed blueprint and design documents
├── frontend/           # The Game Engine / WebUI code (React/Three.js)
├── server/             # The Orchestrator WebSocket Server (Node.js/FastAPI)
└── agents/             # The Python/JS Autonomous Agents and Supervisor logic
```

## Running Locally

To easily run the entire framework (Server, Frontend, and Agent Supervisor) locally, use the provided helper scripts.

1. Ensure you have Node.js and Python 3 installed.
2. Ensure you have installed the server dependencies (`cd server && npm install`) and agent dependencies (`pip install -r agents/requirements.txt`).
3. Start the system:
   ```bash
   ./run.sh
   ```
4. Access the different views:
   - **End User View**: http://localhost:3000
   - **Engineer Game View**: http://localhost:3000/engineer.html
5. To stop all background services, run:
   ```bash
   ./stop.sh
   ```
