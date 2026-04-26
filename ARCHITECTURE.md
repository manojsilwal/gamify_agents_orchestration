# Framework Architecture & Design

This document outlines the blueprint for building an autonomous, game-like environment for AI agents.

## 1. The Core Architecture

The system decouples agent logic from visualization.

### The Game Frontend (Visualization Layer)
* **Tech Stack:** React, Three.js (for 3D), or Phaser.js (for 2D).
* **Role:** Connects via WebSockets to the server. It listens for events (`SPAWN`, `TOOL_CALL`, `PROCESSING`) and maps them to visual animations or dynamic UI components.
* **WebUI & Generative UI:** Allows the agent to build its own interface on the fly. If the agent analyzes data, it streams a React pie chart. If it needs configuration, it generates a form.

### The Local Server (Orchestrator)
* **Tech Stack:** Node.js (Express + WebSockets) or Python (FastAPI).
* **Role:** The "Game Server". Maintains workspace state, manages active agent loops, and broadcasts events between the Agents and the Frontend.

### The Agents & Hooks
* **Role:** The actual AI loops using frameworks like LangGraph or AutoGen. Agents emit structured logs/events rather than just text.

---

## 2. Autonomous Value Creation (The Agent Loop)

To make agents autonomous, they must operate in a continuous loop evaluating "Value".

1. **Observe:** Scan the environment (e.g., read a GitHub issue, check logs).
2. **Orient/Reason:** Analyze observations against the ultimate goal.
3. **Decide:** Formulate a plan (e.g., "Write a fix in app.py").
4. **Act:** Execute tools (bash, write_file).
5. **Evaluate:** Did the action succeed? If not, loop back.

---

## 3. The "Soul" (Goal Alignment & Safety)

To ensure the agent never deviates from the company/app goal, we use a strict alignment framework:

### Layer 1: The Core Directive
The System Prompt acts as the Constitution.
*Example:* "The ultimate goal is to provide the fastest checkout experience. Before acting, ask: Does this improve checkout? If not, reject."

### Layer 2: The Supervisor Agent
A multi-agent setup where a "Worker" proposes a plan and a "Supervisor" evaluates it against the core goal. If the plan deviates, the Supervisor rejects it and redirects the Worker.

### Layer 3: Mission Decomposition
The Orchestrator holds a backlog of tasks aligned with the goal. It dispatches bite-sized, bounded missions to the agents rather than open-ended directives.

### Layer 4: The Alignment Dashboard (Human-in-the-Loop)
The WebUI provides observability:
* **The "Soul" Meter:** Visualizes confidence in goal alignment.
* **Trace Logs:** Visually maps agent steps back to the core goal.
* **Kill Switch:** A manual override for the human to halt the loop.
