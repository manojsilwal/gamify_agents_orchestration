const ws = new WebSocket('ws://localhost:8080');
const statusEl = document.getElementById('status');
const btn = document.getElementById('searchBtn');
const resultBox = document.getElementById('result');

ws.onopen = () => { statusEl.textContent = 'Connected to AI Engine'; };
ws.onclose = () => { statusEl.textContent = 'Disconnected'; };

btn.addEventListener('click', () => {
    const goal = document.getElementById('goal').value;
    if (!goal) return;

    // Reset UI
    resultBox.style.display = 'none';
    statusEl.textContent = 'Analyzing combinations... Please wait.';
    btn.disabled = true;

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

            resultBox.style.display = 'block';
            statusEl.textContent = 'Optimization complete!';
            btn.disabled = false;
        }
    } catch(e) {}
};
