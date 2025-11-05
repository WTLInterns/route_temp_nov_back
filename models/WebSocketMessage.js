
class WebSocketMessage {
    constructor(type, driverId, role, location = null) {
        this.type = type;  // Type of the message (register, location, etc.)
        this.driverId = driverId;  // Unique identifier for the user
        this.role = role;  // Role of the user (e.g., driver, rider, admin)
        this.location = location;  // Location data (optional for some message types)
    }

    // Method to convert the message to a JSON string
    toJSON() {
        const { type, driverId, role, location } = this;
        return JSON.stringify({ type, driverId, role, location });
    }

    // Static method to create a 'register' message
    static createRegisterMessage(driverId, role) {
        return new WebSocketMessage("register", driverId, role);
    }

    // Static method to create a 'location' update message
    static createLocationUpdateMessage(driverId, role, location) {
        return new WebSocketMessage("location", driverId, role, location);
    }

    // You can also add more static methods for other types of messages as needed
}

module.exports = WebSocketMessage;