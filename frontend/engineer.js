const ws = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('canvas-container');
const logs = document.getElementById('logs');

const agents = {};

function addLog(msg) {
    const div = document.createElement('div');
    div.className = 'log';
    div.textContent = `> ${msg}`;
    logs.prepend(div);
}

function createAgentNode(id, isSupervisor = false) {
    if (agents[id]) return;

    const node = document.createElement('div');
    node.className = `agent ${isSupervisor ? 'supervisor' : ''}`;
    node.setAttribute('data-id', id);

    if (!isSupervisor) {
        // Random position around the center
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * 200;
        const x = window.innerWidth / 2 + Math.cos(angle) * radius;
        const y = window.innerHeight / 2 + Math.sin(angle) * radius;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
    }

    canvas.appendChild(node);
    agents[id] = node;
}

function updateAgentState(id, state) {
    const node = agents[id];
    if (!node) return;

    if (state === 'THINKING') {
        node.classList.add('thinking');
    } else {
        node.classList.remove('thinking');
    }
}

function removeAgentNode(id) {
    const node = agents[id];
    if (!node) return;

    node.classList.add('dead');
    setTimeout(() => {
        if (canvas.contains(node)) canvas.removeChild(node);
        delete agents[id];
    }, 500);
}

ws.onopen = () => {
    addLog('SYSTEM: WebSocket connected.');
    // Ensure supervisor is always visible
    createAgentNode('Supervisor', true);
};

ws.onmessage = (event) => {
    try {
        const payload = JSON.parse(event.data);
        const type = payload.type;
        const data = payload.data;
        const agentId = payload.agentId || 'Supervisor';

        if (type === 'USER_GOAL') {
            addLog(`Goal Received: ${data.goal}`);
            updateAgentState('Supervisor', 'THINKING');
        } else if (type === 'SPAWN') {
            createAgentNode(agentId);
            addLog(`[${agentId}] Spawned`);
        } else if (type === 'THINKING') {
            updateAgentState(agentId, 'THINKING');
            addLog(`[${agentId}] Thinking: ${data.thought}`);
        } else if (type === 'TOOL_CALL') {
            updateAgentState(agentId, 'NORMAL');
            addLog(`[${agentId}] Tool Call: ${data.tool}`);
        } else if (type === 'RESULT') {
            updateAgentState(agentId, 'NORMAL');
            addLog(`[${agentId}] Result: Score ${data.strategy?.score || 'N/A'}`);
        } else if (type === 'DIE') {
            removeAgentNode(agentId);
            addLog(`[${agentId}] Terminated`);
        } else if (type === 'FINAL_RESULT') {
            updateAgentState('Supervisor', 'NORMAL');
            addLog(`[Supervisor] Final Output Delivered.`);
        }
    } catch(e) {}
};
