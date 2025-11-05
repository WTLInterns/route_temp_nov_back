const WebSocket = require("ws")

// Driver connections keyed by driverId
// value: { ws, latestLocation, metadata }
const driverSessions = new Map()

// Viewer/Admin connections keyed by viewerId (could be adminId or uuid)
// value: { ws, trackDriverId }
const viewerSessions = new Map()

const safeSend = (ws, payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

const cleanupConnection = (ws) => {
  // Remove from driver sessions if present
  for (const [driverId, session] of driverSessions.entries()) {
    if (session.ws === ws) {
      console.log(`driver (${driverId}) disconnected`)
      driverSessions.delete(driverId)
      return
    }
  }

  // Remove from viewer sessions if present
  for (const [viewerId, session] of viewerSessions.entries()) {
    if (session.ws === ws) {
      console.log(`viewer (${viewerId}) disconnected`)
      viewerSessions.delete(viewerId)
      return
    }
  }
}

const broadcastToViewers = (driverId, payload) => {
  for (const [, session] of viewerSessions.entries()) {
    if (session.trackDriverId?.toString() === driverId.toString()) {
      safeSend(session.ws, payload)
    }
  }
}

const handleDriverRegistration = (ws, data) => {
  if (!data.driverId) {
    safeSend(ws, {
      type: "error",
      message: "driverId is required to register as driver",
    })
    return
  }

  driverSessions.set(data.driverId.toString(), {
    ws,
    latestLocation: null,
    metadata: data.metadata || {},
  })

  console.log(`driver (${data.driverId}) connected`)

  safeSend(ws, {
    type: "register_confirmation",
    role: "driver",
    driverId: data.driverId,
    message: "Driver registered for live tracking",
  })
}

const handleViewerRegistration = (ws, data) => {
  if (!data.viewerId) {
    safeSend(ws, {
      type: "error",
      message: "viewerId is required to register as viewer",
    })
    return
  }

  if (!data.trackDriverId) {
    safeSend(ws, {
      type: "error",
      message: "trackDriverId is required to subscribe to driver updates",
    })
    return
  }

  viewerSessions.set(data.viewerId.toString(), {
    ws,
    trackDriverId: data.trackDriverId.toString(),
  })

  console.log(`viewer (${data.viewerId}) watching driver ${data.trackDriverId}`)

  safeSend(ws, {
    type: "register_confirmation",
    role: "viewer",
    viewerId: data.viewerId,
    trackDriverId: data.trackDriverId,
    message: "Viewer registered for live tracking",
  })

  const driverSession = driverSessions.get(data.trackDriverId.toString())
  if (driverSession?.latestLocation) {
    safeSend(ws, {
      type: "location_update",
      driverId: data.trackDriverId,
      location: driverSession.latestLocation,
      replay: true,
    })
  }
}

const handleLocationUpdate = (data) => {
  if (!data.driverId || !data.location) {
    return
  }

  const driverId = data.driverId.toString()
  const driverSession = driverSessions.get(driverId)

  if (!driverSession) {
    return
  }

  const enrichedLocation = {
    latitude: Number(data.location.latitude),
    longitude: Number(data.location.longitude),
    timestamp: data.location.timestamp || new Date().toISOString(),
    speed: data.location.speed != null ? Number(data.location.speed) : null,
    phase: data.location.phase || "approaching_pickup",
    pickup: data.location.pickup || null,
    drop: data.location.drop || null,
    address: data.location.address || null,
  }

  driverSession.latestLocation = enrichedLocation
  driverSessions.set(driverId, driverSession)

  broadcastToViewers(driverId, {
    type: "location_update",
    driverId,
    location: enrichedLocation,
  })
}

const handleConnection = (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message)

      switch (data.type) {
        case "register":
          if (data.role === "driver") {
            handleDriverRegistration(ws, data)
          } else {
            handleViewerRegistration(ws, data)
          }
          break

        case "location":
          handleLocationUpdate(data)
          break

        case "ping":
          safeSend(ws, { type: "pong" })
          break

        default:
          safeSend(ws, {
            type: "error",
            message: `Unknown message type: ${data.type}`,
          })
      }
    } catch (error) {
      safeSend(ws, {
        type: "error",
        message: "Invalid message payload",
      })
    }
  })

  ws.on("close", () => cleanupConnection(ws))
  ws.on("error", () => cleanupConnection(ws))
}

module.exports = { handleConnection }


