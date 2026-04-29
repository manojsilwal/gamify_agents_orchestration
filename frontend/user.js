const ws = new WebSocket('ws://localhost:8080');
const statusEl = document.getElementById('status');
const btn = document.getElementById('searchBtn');
const resultBox = document.getElementById('result');
const spinner = document.getElementById('spinner');

ws.onopen = () => { statusEl.textContent = 'Agent Swarm Online. Ready for instructions.'; };
ws.onclose = () => { statusEl.textContent = 'Disconnected from server.'; };

btn.addEventListener('click', () => {
    const goal = document.getElementById('goal').value;
    if (!goal) return;

    // Reset UI
    resultBox.classList.add('hidden');
    statusEl.textContent = 'Swarm deployed. Analyzing millions of routing combinations...';
    btn.disabled = true;
    spinner.classList.remove('hidden');

    // Send goal to agents
    ws.send(JSON.stringify({
        type: 'USER_GOAL',
        data: { goal: goal },
        timestamp: Date.now() / 1000
    }));
});

ws.onmessage = (event) => {
    try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'FINAL_RESULT') {
            document.getElementById('res-cards').textContent = payload.data.strategy.recommended_cards.join(', ');
            document.getElementById('res-partners').textContent = payload.data.strategy.target_transfer_partners.join(', ');
            document.getElementById('res-sweetspot').textContent = payload.data.strategy.sweet_spot_example;

            resultBox.classList.remove('hidden');
            statusEl.textContent = 'Optimization complete!';
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    } catch(e) {}
};
