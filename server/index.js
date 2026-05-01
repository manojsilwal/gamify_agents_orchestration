const WebSocket = require('ws');
const https = require('https');

const wss = new WebSocket.Server({ port: 8080 });

console.log('Orchestrator WebSocket Server started on port 8080');

const clients = new Set();

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  clients.add(ws);

  ws.on('message', async function incoming(message) {
    try {
        const data = JSON.parse(message);
        console.log(`Received [${data.type}]`);

        if (data.type === 'GEMINI_PROXY_REQUEST') {
            await handleGeminiProxy(ws, data);
            return;
        }

        clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (e) {
        console.log('Received raw message or parsing error:', e.message);
    }
  });

  ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
  });
});

async function handleGeminiProxy(ws, payload) {
    const { correlationId, apiKey, requestBody } = payload.data;

    // Using gemini-3.1-pro as requested by user
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const parsed = JSON.parse(responseData);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    ws.send(JSON.stringify({
                        type: 'GEMINI_PROXY_RESPONSE',
                        data: {
                            correlationId,
                            success: true,
                            body: parsed
                        }
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'GEMINI_PROXY_RESPONSE',
                        data: {
                            correlationId,
                            success: false,
                            error: parsed
                        }
                    }));
                }
            } catch (err) {
                 ws.send(JSON.stringify({
                    type: 'GEMINI_PROXY_RESPONSE',
                    data: {
                        correlationId,
                        success: false,
                        error: { message: "Failed to parse gemini response" }
                    }
                }));
            }
        });
    });

    req.on('error', (e) => {
        ws.send(JSON.stringify({
            type: 'GEMINI_PROXY_RESPONSE',
            data: {
                correlationId,
                success: false,
                error: { message: e.message }
            }
        }));
    });

    req.write(JSON.stringify(requestBody));
    req.end();
}
