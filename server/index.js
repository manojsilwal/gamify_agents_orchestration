const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('Orchestrator WebSocket Server started on port 8080');

// Keep track of active connections
const clients = new Set();

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  clients.add(ws);

  ws.on('message', function incoming(message) {
    try {
        const data = JSON.parse(message);
        console.log(`Received [${data.type}]:`, JSON.stringify(data).substring(0, 100) + '...');

        // Broadcast the message to all clients
        clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (e) {
        console.log('Received raw message:', message.toString());
    }
  });

  ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
  });
});
