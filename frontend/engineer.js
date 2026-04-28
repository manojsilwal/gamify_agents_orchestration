const ws = new WebSocket('ws://localhost:8080');
const logs = document.getElementById('logs');
const statusEl = document.getElementById('conn-status');

function formatTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
}

function addLog(agent, msg, colorClass = 'text-gray-400') {
    const div = document.createElement('div');
    div.innerHTML = `<span class="text-gray-600">[${formatTime()}]</span> <span class="font-bold ${colorClass}">${agent}</span>: ${msg}`;
    logs.prepend(div);
}

function triggerGlow(elementId, duration = 1500) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add('active-glow');
    el.style.opacity = '1';
    setTimeout(() => {
        el.classList.remove('active-glow');
        if(elementId.startsWith('agent-') && elementId !== 'agent-Summoner') {
            el.style.opacity = '0.5';
        }
    }, duration);
}

function activateSkill(skillName) {
    const el = document.getElementById(`skill-${skillName}`);
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => {
        el.classList.remove('active');
    }, 2000);
}

ws.onopen = () => {
    statusEl.textContent = '● CONNECTED';
    statusEl.className = 'text-green-500 anim-flash';
    addLog('SYSTEM', 'WebSocket connected to Orchestrator Core.', 'text-green-500');
};

ws.onclose = () => {
    statusEl.textContent = '○ DISCONNECTED';
    statusEl.className = 'text-red-500';
    addLog('SYSTEM', 'Connection lost.', 'text-red-500');
};

ws.onmessage = (event) => {
    try {
        const payload = JSON.parse(event.data);
        const type = payload.type;
        const data = payload.data;
        const agentId = payload.agentId || 'Summoner';

        // Color mapping for logs
        const colors = {
            'Summoner': 'text-[#10b981]',
            'Scout': 'text-[#3b82f6]',
            'Analyst': 'text-[#8b5cf6]',
            'Executor': 'text-[#10b981]',
            'Auditor': 'text-[#f59e0b]'
        };
        const c = colors[agentId] || 'text-gray-300';

        if (type === 'USER_GOAL') {
            addLog('SYSTEM', `New Directve: ${data.goal}`, 'text-white');
            triggerGlow('agent-Summoner', 3000);
            document.getElementById('Summoner-status').textContent = 'PROCESSING DIRECTIVE';
        } else if (type === 'SPAWN') {
            triggerGlow(`agent-${agentId}`, 2000);
            addLog(agentId, `Instantiated. Role: ${data.role}`, c);
        } else if (type === 'THINKING') {
            triggerGlow(`agent-${agentId}`, 1000);
            addLog(agentId, data.thought, c);
            if(agentId === 'Summoner') document.getElementById('Summoner-status').textContent = data.thought;
        } else if (type === 'SKILL_USE') {
            activateSkill(data.skill);
            addLog(agentId, `Using skill: [${data.skill}]`, c);
        } else if (type === 'MEMORY_ACCESS') {
            triggerGlow('hub-Memory', 2000);
            addLog('CORAL_HUB', data.action, 'text-[#b45309]');
        } else if (type === 'SELF_IMPROVEMENT') {
            triggerGlow('hub-Improve', 3000);
            addLog('MUTATION_ENGINE', data.action, 'text-[#4d7c0f]');
        } else if (type === 'RESULT') {
            addLog(agentId, `Task Complete. XP Gained: ${data.xp_gained}`, c);
        } else if (type === 'DIE') {
            addLog(agentId, data.message, 'text-gray-500');
        } else if (type === 'FINAL_RESULT') {
            triggerGlow('agent-Summoner', 3000);
            document.getElementById('Summoner-status').textContent = 'STRATEGY DEPLOYED. IDLE.';
            addLog('Summoner', `Final strategy compiled. Score: ${data.strategy.score}`, colors['Summoner']);
        }
    } catch(e) {}
};
