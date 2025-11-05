const WebSocket = require("ws");

const wss = new WebSocket.Server({ 
  port: 6010,
  perMessageDeflate: false // Disable compression for debugging
});

console.log("✅ WebSocket server running at ws://localhost:7001");
console.log("📡 Waiting for client connections...");

const clients = new Map(); // IMEI → [ws, ws]
const driverConnections = new Map(); // driverId → ws

// Add heartbeat mechanism to keep connections alive
const heartbeat = function() {
  this.isAlive = true;
};

wss.on("connection", (ws, req) => {
  console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
  
  // Initialize heartbeat
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  
  ws.on("message", (message) => {
    try {
      console.log(`📨 Raw message received: ${message}`);
      
      const parsedMessage = JSON.parse(message);
      console.log(`🔍 Parsed message:`, parsedMessage);
      
      // Handle driver registration messages (from mobile app)
      if (parsedMessage.type === "register" && parsedMessage.role === "driver") {
        handleDriverRegistration(ws, parsedMessage);
        return;
      }
      
      // Handle location updates from drivers (from mobile app)
      if (parsedMessage.type === "location" && parsedMessage.driverId) {
        handleDriverLocationUpdate(parsedMessage);
        return;
      }
      
      // Handle ping messages (from mobile app)
      if (parsedMessage.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      
      // Handle IMEI subscription (from frontend admin panel)
      const { imei } = parsedMessage;
      
      if (!imei) {
        console.warn("⚠️  No IMEI provided in message");
        ws.send(JSON.stringify({ error: "IMEI is required" }));
        return;
      }
      
      // Store IMEI for this WebSocket connection
      ws.imei = imei;
      
      // Add client to IMEI subscription map
      if (!clients.has(imei)) {
        clients.set(imei, []);
        console.log(`📋 Created new subscription list for IMEI: ${imei}`);
      }
      
      const clientList = clients.get(imei);
      if (!clientList.includes(ws)) {
        clientList.push(ws);
        console.log(`✅ Client subscribed for IMEI: ${imei}`);
        console.log(`📊 Total subscribers for ${imei}: ${clientList.length}`);
      } else {
        console.log(`🔄 Client already subscribed for IMEI: ${imei}`);
      }
      
      // Send confirmation back to client
      ws.send(JSON.stringify({ 
        type: 'subscription_confirmed', 
        imei: imei,
        message: `Successfully subscribed to GPS updates for ${imei}`
      }));
      
      console.log(`📡 Subscription confirmed for IMEI: ${imei}`);
      
    } catch (err) {
      console.error("❌ Error parsing message from client:", err.message);
      console.error("📋 Raw message that failed:", message.toString());
      ws.send(JSON.stringify({ error: "Invalid JSON message" }));
    }
  });
});

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(function ping() {
  console.log(`💓 Sending heartbeat to ${wss.clients.size} clients`);
  
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log(`💀 Terminating dead connection for IMEI: ${ws.imei || 'unknown'}`);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

// Enhanced broadcast function with detailed logging
function getBroadcastGPS() {
 return function (imei, lat, lon, ignition, speed){
    console.log(`🛰️  Broadcasting GPS data for IMEI: ${imei}`);
    console.log(`📍 Coordinates: ${lat}, ${lon}`);
    console.log(`🔥 Ignition: ${ignition ? 'ON' : 'OFF'}`);
    console.log(`🚗 Speed: ${speed} km/h`);
    
    const subscribers = clients.get(imei) || [];
    console.log(`📡 Found ${subscribers.length} subscribers for IMEI: ${imei}`);
    
    if (subscribers.length === 0) {
      console.log(`⚠️  No subscribers found for IMEI: ${imei}`);
      console.log(`📋 Available IMEIs:`, Array.from(clients.keys()));
      return;
    }
    
    const message = JSON.stringify({ 
      type: 'gps_update',
      imei, 
      lat: parseFloat(lat), 
      lon: parseFloat(lon),
      ignition: ignition,           // Added ignition status
      speed: parseInt(speed),  
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Broadcasting message: ${message}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const client of subscribers) {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          successCount++;
          console.log(`✅ Message sent to client for IMEI: ${imei}`);
        } else {
          failCount++;
          console.log(`❌ Client connection not open for IMEI: ${imei}, state: ${client.readyState}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error sending message to client for IMEI: ${imei}`, error);
      }
    }
    
    console.log(`📊 Broadcast summary for ${imei}: ${successCount} success, ${failCount} failed`);
  };
}

// Server error handling
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  clearInterval(heartbeatInterval);
  
  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });
  
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

// Test function to simulate GPS data (for debugging)
// function simulateGPSData() {
//   const testIMEI = "123456789012345";
//   const broadcast = getBroadcastGPS();
//
//   // Simulate GPS coordinates around Pune
//   const baseLat = 18.5204;
//   const baseLng = 73.8567;
//
//   setInterval(() => {
//     const lat = baseLat + (Math.random() - 0.5) * 0.01; // Small random movement
//     const lng = baseLng + (Math.random() - 0.5) * 0.01;
//
//     console.log(` Simulating GPS data for testing...`);
//     broadcast(testIMEI, lat, lng);
//   }, 5000); // Every 5 seconds
// }

// Uncomment the line below to enable GPS simulation for testing
// simulateGPSData();

// Handler functions for mobile app driver connections
function handleDriverRegistration(ws, data) {
  console.log("🚗 Driver registration attempt:", data);
  if (!data.driverId) {
    console.log("❌ Driver registration failed: driverId missing");
    ws.send(JSON.stringify({ type: "error", message: "driverId is required" }));
    return;
  }

  const driverId = data.driverId.toString();
  driverConnections.set(driverId, ws);
  ws.driverId = driverId;

  console.log("✅ Driver registered successfully:", driverId);
  ws.send(JSON.stringify({
    type: "register_confirmation",
    role: "driver",
    driverId,
    message: "Driver registered for live tracking",
  }));

  console.log(`📊 Total driver connections: ${driverConnections.size}`);
}

function handleDriverLocationUpdate(data) {
  console.log("📍 Driver location update received:", data);
  if (!data.driverId || !data.location) {
    console.log("❌ Invalid location update - missing driverId or location:", { driverId: data.driverId, hasLocation: !!data.location });
    return;
  }

  const driverId = data.driverId.toString();

  // Store the driver's latest location
  const location = {
    latitude: Number(data.location.latitude),
    longitude: Number(data.location.longitude),
    timestamp: data.location.timestamp || new Date().toISOString(),
    speed: data.location.speed != null ? Number(data.location.speed) : null,
    phase: data.location.phase || "approaching_pickup",
  };

  console.log("✅ Location stored for driver:", driverId);

  // TODO: Here you could also trigger the GPS broadcast to admin subscribers
  // For now, we'll just log it
  console.log(`🚗 Driver ${driverId} location: ${location.latitude}, ${location.longitude}`);
}


module.exports = { getBroadcastGPS };