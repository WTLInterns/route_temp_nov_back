
// const jwt = require("jsonwebtoken");
// const { Admin } = require("../models");

// // ✅ Middleware to authenticate the admin using JWT
// exports.authMiddleware = async (req, res, next) => {
//   try {
//     const authHeader = req.header("Authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Access Denied: No Token Provided" });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Sequelize method to find admin by primary key (id)
//     const admin = await Admin.findByPk(decoded.id);

//     if (!admin) {
//       return res.status(401).json({ message: "Invalid Token: Admin not found" });
//     }

//     // ✅ Attach admin data to request object
//     req.admin = {
//       id: admin.id,
//       role: admin.role,
//       permissions: admin.permissions || [], // In case you use permission-based access
//     };

//     next();
//   } catch (error) {
//     console.error("Auth Middleware Error:", error.message);
//     return res.status(401).json({ message: "Unauthorized", error: error.message });
//   }
// };

// // ✅ Middleware to allow only super admins
// exports.isSuperAdmin = (req, res, next) => {
//   if (req.admin.role !== "superadmin") {
//     return res.status(403).json({ message: "Access Denied: Super Admins Only" });
//   }
//   next();
// };

// // ✅ Middleware to allow both admins and superadmins
// exports.isAdmin = (req, res, next) => {
//   const allowedRoles = ["Admin", "superadmin", "subadmin"];
//   if (!allowedRoles.includes(req.admin.role)) {
//     return res.status(403).json({ message: "Access Denied: Admins Only" });
//   }
//   next();
// };

// // ✅ Optional: Middleware for checking dynamic permissions like "drivers", "cabs", etc.
// exports.validateAdminAccess = (req, res, next) => {
//   try {
//     const { role, permissions } = req.admin;

//     if (role === "superadmin") return next(); // superadmin has full access

//     const entity = req.baseUrl.split("/")[1]; // e.g., "/api/drivers" -> "drivers"

//     if (!permissions.includes(entity)) {
//       return res.status(403).json({ message: `Access Denied: No Permission for ${entity}` });
//     }

//     next();
//   } catch (error) {
//     console.error("Permission Middleware Error:", error.message);
//     return res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };


const jwt = require("jsonwebtoken");
const { Admin } = require("../models");

// ✅ Middleware to authenticate the admin using JWT
exports.authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sequelize method to find admin by primary key (id)
    const admin = await Admin.findByPk(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Invalid Token: Admin not found" });
    }

    // ✅ Attach admin data to request object
    req.admin = {
      id: admin.id,
      role: admin.role,
      permissions: admin.permissions || [], // optional permissions
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};

// ✅ Middleware to allow only super admins
exports.isSuperAdmin = (req, res, next) => {
  if (req.admin.role !== "superadmin") {
    return res.status(403).json({ message: "Access Denied: Super Admins Only" });
  }
  next();
};

// ✅ Middleware to allow both admins and superadmins
exports.isAdmin = (req, res, next) => {
  const allowedRoles = ["admin", "superadmin", "subadmin"];
  if (!allowedRoles.includes(req.admin.role)) {
    return res.status(403).json({ message: "Access Denied: Admins Only" });
  }
  next();
};

// ✅ Optional: Middleware for checking dynamic permissions like "drivers", "cabs", etc.
exports.validateAdminAccess = (req, res, next) => {
  try {
    const { role, permissions } = req.admin;

    if (role === "superadmin") return next(); // superadmin has full access

    const entity = req.baseUrl.split("/")[1]; // e.g., "/api/drivers" -> "drivers"

    if (!permissions.includes(entity)) {
      return res.status(403).json({ message: `Access Denied: No Permission for ${entity}` });
    }

    next();
  } catch (error) {
    console.error("Permission Middleware Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Middleware to check active subscription for subadmins
exports.checkActiveSubscription = async (req, res, next) => {
  try {
    const admin = await Admin.findByPk(req.admin.id);

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const today = new Date();

    if (!admin.subscriptionType || new Date(admin.subscriptionEnd) < today) {
      return res.status(403).json({
        message: "Action restricted. Please start a trial or get a paid subscription."
      });
    }

    next();
  } catch (error) {
    console.error("Subscription Check Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};
