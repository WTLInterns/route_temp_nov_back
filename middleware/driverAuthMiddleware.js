// const jwt = require("jsonwebtoken");
// const Driver = require("../models/loginModel"); // Adjust the path as needed

// exports.driverAuthMiddleware = async (req, res, next) => {
//   try {
//     const token = req.header("Authorization")?.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({ message: "Access Denied: No Token Provided" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const driver = await Driver.findById(decoded.id).select("-password");

//     if (!driver) {
//       return res.status(401).json({ message: "Invalid Token" });
//     }

//     req.driver = driver; // Attach driver to request object
//     console.log(driver);
   
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Unauthorized", error: error.message });
//   }
// };



const jwt = require("jsonwebtoken");
const { Driver } = require("../models"); // Adjust path if needed

exports.driverAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const driver = await Driver.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!driver) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    req.driver = driver;

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};
