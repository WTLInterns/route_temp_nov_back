const jwt = require("jsonwebtoken");

// ✅ Middleware to verify JWT token
exports.authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
    }
};

// ✅ Middleware to check Admin Role
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied. Admins only." });
    next();
};



