const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('Orchestrator WebSocket Server started on port 8080');

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    // Broadcast the message to all clients
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
      console.log('Client disconnected');
  });
});
