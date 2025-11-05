const jwt = require("jsonwebtoken");
const { Admin, Driver } = require("../models");

// Verifies bearer token and attaches either req.admin or req.driver
// Returns 401 with clear codes/messages for missing/expired/invalid tokens
exports.adminOrDriverAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ code: "TOKEN_MISSING", message: "Access Denied: No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try admin first
    const admin = await Admin.findByPk(decoded.id);
    if (admin) {
      req.admin = { id: admin.id, role: admin.role };
      req.authType = "admin";
      return next();
    }

    // Fallback to driver
    const driver = await Driver.findByPk(decoded.id, { attributes: { exclude: ["password"] } });
    if (driver) {
      req.driver = driver;
      req.authType = "driver";
      return next();
    }

    return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token." });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ code: "TOKEN_EXPIRED", message: "Token expired. Please log in again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token." });
    }
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
};

// Ensures that either an admin is authenticated, or a driver whose id matches :driverId
exports.isAdminOrSelfDriver = (req, res, next) => {
  // Admins are always allowed
  if (req.authType === "admin" && req.admin) return next();

  // Drivers only if requesting their own data
  if (req.authType === "driver" && req.driver) {
    const paramId = String(req.params.driverId || "");
    if (paramId && String(req.driver.id) === paramId) return next();
    return res.status(403).json({ code: "FORBIDDEN", message: "Access Denied: Drivers can only access their own records" });
  }

  return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
};
