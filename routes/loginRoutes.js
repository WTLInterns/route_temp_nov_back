const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/loginController");
const { authMiddleware,isAdmin } = require("../middleware/authMiddleware");
const uploadFields = require ("../middleware/uploadFields")


// Public routes
router.post(
    "/register",authMiddleware,isAdmin,uploadFields, registerUser);
  
// router.post("/login",authMiddleware,isAdmin, loginUser);
router.post("/login", loginUser);

module.exports = router;
