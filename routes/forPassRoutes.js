
const express = require("express")
const { sendOTP, verifyOTP, resetPassword } = require("../controllers/forPassController")

const router = express.Router()

// New routes for OTP-based password reset
router.post("/send-otp", sendOTP)
router.post("/verify-otp", verifyOTP)
router.post("/reset-password", resetPassword)

module.exports = router
