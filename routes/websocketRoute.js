const WebSocket = require("ws")

const HEARTBEAT_INTERVAL_MS = 30_000

const driverSessions = new Map() // driverId -> { ws, latestLocation }
const viewerSessions = new Map() // viewerId -> { ws, trackDriverId }
const imeiSubscribers = new Map() // imei -> Set<ws>
const latestGPS = new Map() // imei -> { lat, lon, ignition, speed, timestamp }

const safeSend = (ws, payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

const subscribeToImei = (ws, imei) => {
  if (!imei) {
    safeSend(ws, { type: "error", message: "IMEI is required to subscribe" })
    return
  }

  const key = imei.toString()
  if (!imeiSubscribers.has(key)) {
    imeiSubscribers.set(key, new Set())
  }

  imeiSubscribers.get(key).add(ws)
  ws.subscribedImei = key

  safeSend(ws, {
    type: "subscription_confirmed",
    imei: key,
    message: `Subscribed to GPS updates for ${key}`,
  })

  const latest = latestGPS.get(key)
  if (latest) {
    safeSend(ws, { type: "gps_update", imei: key, ...latest, replay: true })
  }
}

const handleDriverRegister = (ws, data) => {
  console.log("🚗 Driver registration attempt:", data)
  if (!data.driverId) {
    console.log("❌ Driver registration failed: driverId missing")
    safeSend(ws, { type: "error", message: "driverId is required" })
    return
  }

  const driverId = data.driverId.toString()
  driverSessions.set(driverId, { ws, latestLocation: null, metadata: data.metadata || {} })
  ws.driverId = driverId

  console.log("✅ Driver registered successfully:", driverId)
  safeSend(ws, {
    type: "register_confirmation",
    role: "driver",
    driverId,
    message: "Driver registered for live tracking",
  })
}

const handleViewerRegister = (ws, data) => {
  if (!data.viewerId || !data.trackDriverId) {
    safeSend(ws, {
      type: "error",
      message: "viewerId and trackDriverId are required",
    })
    return
  }

  const viewerId = data.viewerId.toString()
  const trackDriverId = data.trackDriverId.toString()

  viewerSessions.set(viewerId, { ws, trackDriverId })
  ws.viewerId = viewerId

  safeSend(ws, {
    type: "register_confirmation",
    role: "viewer",
    viewerId,
    trackDriverId,
    message: "Viewer registered for live tracking",
  })

  const driverSession = driverSessions.get(trackDriverId)
  if (driverSession?.latestLocation) {
    safeSend(ws, {
      type: "location_update",
      driverId: trackDriverId,
      location: driverSession.latestLocation,
      replay: true,
    })
  }
}

const broadcastDriverLocation = (driverId, location) => {
  for (const [, session] of viewerSessions.entries()) {
    if (session.trackDriverId === driverId) {
      safeSend(session.ws, {
        type: "location_update",
        driverId,
        location,
      })
    }
  }
}

const handleDriverLocation = (data) => {
  console.log("📍 Driver location update received:", data)
  if (!data.driverId || !data.location) {
    console.log("❌ Invalid location update - missing driverId or location:", { driverId: data.driverId, hasLocation: !!data.location })
    return
  }

  const driverId = data.driverId.toString()
  const session = driverSessions.get(driverId)
  if (!session) {
    console.log("❌ No driver session found for driverId:", driverId)
    console.log("📋 Active driver sessions:", Array.from(driverSessions.keys()))
    return
  }

  console.log("✅ Processing location update for driver:", driverId)

  const location = {
    latitude: Number(data.location.latitude),
    longitude: Number(data.location.longitude),
    timestamp: data.location.timestamp || new Date().toISOString(),
    speed: data.location.speed != null ? Number(data.location.speed) : null,
    phase: data.location.phase || "approaching_pickup",
    pickup: data.location.pickup || null,
    drop: data.location.drop || null,
    address: data.location.address || null,
  }

  session.latestLocation = location
  driverSessions.set(driverId, session)
  console.log("✅ Location stored for driver:", driverId, "Total sessions:", driverSessions.size)

  broadcastDriverLocation(driverId, location)
  console.log("📡 Location broadcasted to viewers")
}

const broadcastGPS = (imei, lat, lon, ignition, speed) => {
  if (!imei) {
    return
  }

  const payload = {
    lat: Number(lat),
    lon: Number(lon),
    ignition: Boolean(ignition),
    speed: speed != null ? Number(speed) : null,
    timestamp: new Date().toISOString(),
  }

  latestGPS.set(imei.toString(), payload)

  const subscribers = imeiSubscribers.get(imei.toString())
  if (subscribers?.size) {
    for (const client of subscribers.values()) {
      safeSend(client, { type: "gps_update", imei: imei.toString(), ...payload })
    }
  }
}

const cleanupConnection = (ws) => {
  if (ws.driverId) {
    driverSessions.delete(ws.driverId)
  }

  if (ws.viewerId) {
    viewerSessions.delete(ws.viewerId)
  }

  if (ws.subscribedImei) {
    const set = imeiSubscribers.get(ws.subscribedImei)
    if (set) {
      set.delete(ws)
      if (set.size === 0) {
        imeiSubscribers.delete(ws.subscribedImei)
      }
    }
  }
}

function setupWebSocketServer(server) {
  console.log("🔌 Setting up WebSocket server on port 5000");
  const wss = new WebSocket.Server({ server, perMessageDeflate: false })
  console.log("✅ WebSocket server created successfully")

  wss.on("connection", (ws) => {
    console.log("🌐 New WebSocket client connected")
    ws.isAlive = true

    ws.on("pong", () => {
      ws.isAlive = true
    })

    ws.on("message", (message) => {
      // Any message from client indicates the socket is alive
      ws.isAlive = true
      try {
        console.log("📨 Raw message received:", message.toString())
        const data = JSON.parse(message)
        console.log("📨 Parsed message:", data)

        if (data.type === "register") {
          console.log("🔐 Registration message received")
          if (data.role === "driver") {
            handleDriverRegister(ws, data)
          } else {
            handleViewerRegister(ws, data)
          }
          return
        }

        if (data.type === "location") {
          console.log("📍 Location message received")
          handleDriverLocation(data)
          return
        }

        if (data.type === "ping") {
          console.log("🏓 Ping received, sending pong")
          // Mark connection alive for logical pings from clients that cannot respond to control-frame ping
          ws.isAlive = true
          safeSend(ws, { type: "pong" })
          return
        }

        if (data.type === "subscribe_imei" || data.imei) {
          console.log("📡 IMEI subscription received")
          subscribeToImei(ws, data.imei || data.imeiId)
          return
        }

        console.log("❌ Unsupported message type:", data.type)
        safeSend(ws, { type: "error", message: "Unsupported message type" })
      } catch (error) {
        console.log("❌ Message parsing error:", error.message)
        safeSend(ws, { type: "error", message: "Invalid JSON payload" })
      }
    })

    ws.on("close", () => {
      console.log("❌ WebSocket client disconnected")
      cleanupConnection(ws)
    })

    ws.on("error", () => {
      console.log("🚨 WebSocket error occurred")
      cleanupConnection(ws)
    })
  })

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        cleanupConnection(ws)
        ws.terminate()
        continue
      }

      ws.isAlive = false
      ws.ping()
    }
  }, HEARTBEAT_INTERVAL_MS)

  wss.on("close", () => {
    clearInterval(interval)
  })

  return {
    broadcastGPS,
    latestGPS,
  }
}

module.exports = {
  setupWebSocketServer,
}
