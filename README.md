# Game-Env Autonomous Agent Framework

This repository is a blueprint and foundation for building a "Game-Environment" autonomous agent framework.

## Concept

The goal is to create an environment where AI agents act autonomously to achieve high-level company or app goals, while their actions are visualized in real-time through a dynamic WebUI or Game Engine. Instead of "Instruct-and-Wait", this framework relies on **Goal-Oriented Autonomy**, mapping tasks out in a visual Swarm.

## Architecture Overview

The framework is decoupled into three main layers:

1. **The Game Engine / WebUI (Frontend):** A dynamic interface that listens to events and visualizes the agent's state, tools, and progress in real-time.
2. **The Orchestrator (Server):** A local server (Node.js/WebSocket) that manages state, maintains the WebSocket connection to the frontend, and acts as the central hub.
3. **The Agents & Hooks:** The AI loop where a Supervisor receives goals and dispatches concurrent Worker Agents. They emit standardized JSON events to the Orchestrator.

## Project Structure

```text
.
├── ARCHITECTURE.md     # Detailed blueprint and design documents
├── frontend/           # The Game Engine / WebUI code (Vanilla JS/HTML/CSS)
├── server/             # The Orchestrator WebSocket Server (Node.js)
├── agents/             # The Python Autonomous Swarm Agents
├── run.sh              # Quickstart script to launch the system
└── stop.sh             # Helper script to shutdown the system
```

## Running Locally

To easily run the entire framework (Server, Frontend, and Agent Supervisor) locally, use the provided helper scripts.

1. Ensure you have Node.js and Python 3 installed.
2. Install the server dependencies:
   ```bash
   cd server
   npm install
   cd ..
   ```
3. Install the Python agent dependencies:
   ```bash
   pip install -r agents/requirements.txt
   ```
4. Start the system. This script automatically starts the background WebSocket server, background Python Supervisor agent, and a local HTTP server for the static files.
   ```bash
   ./run.sh
   ```

### Accessing the Dashboards

Once the `./run.sh` script is running, open your web browser to explore the two provided UI views:

#### 1. The Frontend UI (End-User View)
**URL:** `http://localhost:3000`

This is the clean, minimalist view intended for the end-user. It presents a simple input box to submit a travel goal (e.g., "First class to Japan"). Once submitted, the UI waits for the AI agent swarm to finish calculating behind the scenes, and displays a straightforward, optimized credit card and point transfer strategy.

#### 2. The Gamified Agents UI Dashboard (Engineer View)
**URL:** `http://localhost:3000/engineer.html`

This is the interactive "Game Engine" view intended for developers.
- You will see the **Supervisor Agent** stationed in the middle of the screen.
- When a user submits a goal from the End-User view, the Supervisor switches to a "THINKING" state (animated pulse).
- The Supervisor dynamically spawns multiple **Worker Agents** around the canvas, representing concurrent threads analyzing different combinations.
- The Workers pulse as they "THINK" and emit tools. As they finish their micro-tasks, they "DIE" and disappear from the canvas.
- A real-time system log on the right side tracks all WebSocket events flowing through the Orchestrator.

### Shutting Down

To safely stop all background services (Server, Agents, and HTTP daemon), run:
```bash
./stop.sh
```
