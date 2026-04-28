const ws = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('canvas-container');
const logs = document.getElementById('logs');
const statusEl = document.getElementById('conn-status');
const agentCountEl = document.getElementById('agent-count');
const nodeCountEl = document.getElementById('node-count');

const agents = {};
let nodeCount = 0;

function formatTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}

function addLog(msg, type = 'normal') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span class="text-[#45a29e] mr-2">[${formatTime()}]</span> ${msg}`;
    logs.prepend(div);
}

function updateStats() {
    agentCountEl.textContent = Object.keys(agents).length;
    nodeCountEl.textContent = nodeCount;
}

function createAgentNode(id, isSupervisor = false) {
    if (agents[id]) return;

    const node = document.createElement('div');
    node.className = `agent ${isSupervisor ? 'supervisor' : ''}`;
    node.setAttribute('data-id', id);

    if (!isSupervisor) {
        // Random position around the center, bounded to viewport
        const angle = Math.random() * Math.PI * 2;
        // Keep it mostly within the visible area but away from the supervisor
        const radius = 150 + Math.random() * (Math.min(window.innerWidth, window.innerHeight) / 3);
        const x = window.innerWidth / 2 + Math.cos(angle) * radius;
        const y = window.innerHeight / 2 + Math.sin(angle) * radius;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
    }

    canvas.appendChild(node);
    agents[id] = node;
    updateStats();
}

function updateAgentState(id, state) {
    const node = agents[id];
    if (!node) return;

    if (state === 'THINKING') {
        node.classList.add('thinking');
        nodeCount++;
        updateStats();
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
        updateStats();
    }, 500);
}

ws.onopen = () => {
    statusEl.textContent = 'CONNECTED';
    statusEl.classList.add('text-[#66fcf1]');
    statusEl.classList.remove('text-[#ff0000]');
    addLog('SYSTEM: Initialized connection to Mainframe.', 'spawn');
    createAgentNode('Supervisor', true);
};

ws.onclose = () => {
    statusEl.textContent = 'DISCONNECTED';
    statusEl.classList.remove('text-[#66fcf1]');
    statusEl.classList.add('text-[#ff0000]');
    addLog('SYSTEM: Connection to Mainframe lost.', 'die');
};

ws.onmessage = (event) => {
    try {
        const payload = JSON.parse(event.data);
        const type = payload.type;
        const data = payload.data;
        const agentId = payload.agentId || 'Supervisor';

        if (type === 'USER_GOAL') {
            addLog(`INCOMING DIRECTIVE: ${data.goal}`);
            updateAgentState('Supervisor', 'THINKING');
        } else if (type === 'SPAWN') {
            createAgentNode(agentId);
            addLog(`Agent [${agentId}] spawned into grid.`, 'spawn');
        } else if (type === 'THINKING') {
            updateAgentState(agentId, 'THINKING');
            addLog(`[${agentId}] Calculating: ${data.thought}`, 'thinking');
        } else if (type === 'TOOL_CALL') {
            updateAgentState(agentId, 'NORMAL');
            addLog(`[${agentId}] Querying database: ${data.tool}`);
        } else if (type === 'RESULT') {
            updateAgentState(agentId, 'NORMAL');
            addLog(`[${agentId}] Found strategy (Score: ${data.strategy?.score || 'N/A'})`);
        } else if (type === 'DIE') {
            removeAgentNode(agentId);
            addLog(`[${agentId}] Despawned. Thread terminated.`, 'die');
        } else if (type === 'FINAL_RESULT') {
            updateAgentState('Supervisor', 'NORMAL');
            addLog(`[Supervisor] Optimum strategy compiled. Output delivered.`, 'spawn');
        }
    } catch(e) {}
};
