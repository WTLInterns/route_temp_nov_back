const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'RouteBudget Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      websocket: 'enabled',
      database: 'connected',
      api: 'running'
    }
  });
});

// WebSocket health check
router.get('/websocket', (req, res) => {
  try {
    const { getBroadcastGPS, getLatestGPS } = require('../websocketInstance');

    res.json({
      status: 'OK',
      message: 'WebSocket service is operational',
      timestamp: new Date().toISOString(),
      websocket: {
        broadcastGPS: typeof getBroadcastGPS(),
        latestGPS: getLatestGPS().size,
        connectedClients: 0 // This would need to be tracked in the websocket server
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'WebSocket service check failed',
      error: error.message
    });
  }
});

module.exports = router;
