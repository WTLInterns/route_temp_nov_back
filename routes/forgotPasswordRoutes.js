const express = require("express");
const { sendResetOTP, verifyOTP, changePassword } = require("../controllers/forgotPasswordController");

const router = express.Router();

router.post("/sendotp", sendResetOTP); // ✅ Send OTP
router.post("/verifyotp", verifyOTP); // ✅ Verify OTP
router.post("/resetpassword", changePassword); // ✅ Reset Password

module.exports = router;
