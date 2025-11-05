

const WebSocket = require("ws");
const { handleConnection } = require("../controllers/websocketController");

const setupWebSocketServers = (server) => {
    const wss = new WebSocket.Server({ server });
    
    wss.on("connection", (ws) => {
        handleConnection(ws);
    });
};

module.exports = { setupWebSocketServers };