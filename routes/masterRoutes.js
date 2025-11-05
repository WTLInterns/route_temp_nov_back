const express = require('express');
const { registerMasterAdmin, adminLogin, sendOTP,
  verifyOTP,resetPassword,getCabDetails} = require('../controllers/masterController');
const router = express.Router();

// Register Master Admin
router.post('/register-master-admin', registerMasterAdmin);

router.get("/get-cab-details", getCabDetails);

// Master Admin Login
router.post('/login-master-admin', adminLogin);

// @route   POST /api/auth/send-otp
router.post("/send-otp", sendOTP);

// @route   POST /api/auth/verify-otp
router.post("/verify-otp", verifyOTP);

// @route   POST /api/auth/reset-password
router.post("/reset-password", resetPassword);




module.exports = router;
