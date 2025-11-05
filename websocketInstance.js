// websocketInstance.js
let broadcastGPS = () => {};
let latestGPS = new Map();

module.exports = {
  setBroadcastGPS(fn) {
    broadcastGPS = fn;
  },
  getBroadcastGPS() {
    return broadcastGPS;
  },
  setLatestGPS(map) {
    latestGPS = map;
  },
  getLatestGPS() {
    return latestGPS;
  },
};
