document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status');
    const logsContainer = document.getElementById('agent-logs');
    const strategyContainer = document.getElementById('strategy-container');

    // Connect to Orchestrator Server
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
        statusEl.textContent = 'Connected';
        statusEl.className = 'status connected';
        addLog('SYSTEM', 'Connected to Orchestrator WebSocket server.', new Date().toISOString());
    };

    ws.onclose = () => {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status disconnected';
        addLog('SYSTEM', 'Disconnected from server.', new Date().toISOString());
    };

    ws.onmessage = (event) => {
        try {
            // Assume parsing JSON event from server
            const data = JSON.parse(event.data);
            handleAgentEvent(data);
        } catch (e) {
            // If it's not JSON, just log it as raw text
            console.log("Raw message:", event.data);
        }
    };

    function handleAgentEvent(event) {
        const { type, data, timestamp } = event;
        const timeStr = new Date(timestamp * 1000).toLocaleTimeString();

        let logMessage = '';

        switch (type) {
            case 'SPAWN':
                logMessage = data.message;
                break;
            case 'THINKING':
                logMessage = `[${data.step}] ${data.thought}`;
                break;
            case 'TOOL_CALL':
                logMessage = `Executing Tool: ${data.tool}(${JSON.stringify(data.input)})`;
                break;
            case 'RESULT':
                logMessage = data.message;
                renderGenerativeUI(data.strategy);
                break;
            default:
                logMessage = JSON.stringify(data);
        }

        addLog(type, logMessage, timeStr);
    }

    function addLog(type, message, timeStr) {
        const logEl = document.createElement('div');
        logEl.className = `log-entry ${type}`;

        const timeEl = document.createElement('span');
        timeEl.className = 'log-time';
        timeEl.textContent = timeStr;

        const msgEl = document.createElement('span');
        msgEl.textContent = `[${type}] ${message}`;

        logEl.appendChild(timeEl);
        logEl.appendChild(msgEl);

        logsContainer.appendChild(logEl);

        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function renderGenerativeUI(strategy) {
        // Remove empty state
        strategyContainer.classList.remove('empty');

        // Generate HTML based on agent's structured output (Generative UI concept)
        const cardsHtml = strategy.recommended_cards.map(c => `<span class="tag card-tag">${c}</span>`).join('');
        const categoriesHtml = strategy.primary_spend_categories.map(c => `<span class="tag category-tag">${c}</span>`).join('');
        const partnersHtml = strategy.target_transfer_partners.map(c => `<span class="tag partner-tag">${c}</span>`).join('');

        const uiHtml = `
            <div class="strategy-card">
                <h2 class="card-title">Optimized Travel Strategy</h2>

                <div class="strategy-section">
                    <h3>Recommended Credit Cards</h3>
                    <div class="tag-list">
                        ${cardsHtml}
                    </div>
                </div>

                <div class="strategy-section">
                    <h3>Primary Spend Multipliers</h3>
                    <div class="tag-list">
                        ${categoriesHtml}
                    </div>
                </div>

                <div class="strategy-section">
                    <h3>Target Transfer Partners</h3>
                    <div class="tag-list">
                        ${partnersHtml}
                    </div>
                </div>

                <div class="strategy-section">
                    <h3>Sweet Spot Alert</h3>
                    <div class="sweet-spot">
                        ${strategy.sweet_spot_example}
                    </div>
                </div>
            </div>
        `;

        strategyContainer.innerHTML = uiHtml;
    }
});
