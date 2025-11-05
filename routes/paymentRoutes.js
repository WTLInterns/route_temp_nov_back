const express = require("express");
const crypto = require("crypto");
const razorpayInstance = require("../utils/razorpay");
const { authMiddleware } = require("../middleware/authMiddleware")
const { Admin } = require("../models");
const router = express.Router();

/**
 * Create Razorpay order (Frontend कॉल करेल)
 */
router.post("/create-order", authMiddleware, async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const options = {
            amount: amount * 100, // paise मध्ये (₹1 = 100 paise)
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpayInstance.orders.create(options);

        return res.json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("Razorpay order error:", err);
        return res.status(500).json({ success: false, message: "Order creation failed" });
    }
});

/**
 * Verify payment signature (Razorpay ने पाठवलेले)
 */
router.post("/verify-payment", authMiddleware, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        // ✅ जर verification पास झाला तर subscription activate करा
        const subadminId = req.admin.id;
        const admin = await Admin.findByPk(subadminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Subadmin not found" });
        }

        // subscription duration & cabLimit plan नुसार
        const startDate = new Date();
        const endDate = new Date();
        let durationDays, cabLimit, price;

        if (plan === "monthly") {
            durationDays = 30;
            cabLimit = 20;
            price = 15000;
        } else if (plan === "yearly") {
            durationDays = 365;
            cabLimit = 30;
            price = 150000;
        } else {
            return res.status(400).json({ success: false, message: "Invalid plan" });
        }

        endDate.setDate(startDate.getDate() + durationDays);

        // 🟢 सर्व details save करा (payment + subscription)
        admin.subscriptionType = "paid";
        admin.subscriptionStart = startDate;
        admin.subscriptionEnd = endDate;
        admin.subscriptionPrice = price;
        admin.subscriptionCabLimit = cabLimit;

        // Razorpay transaction details
        admin.razorpayOrderId = razorpay_order_id;
        admin.razorpayPaymentId = razorpay_payment_id;
        admin.razorpaySignature = razorpay_signature;

        await admin.save();

        return res.json({
            success: true,
            message: "Payment verified & subscription activated",
            subscription: {
                type: "paid",
                plan,
                price,
                startDate,
                endDate,
                cabLimit,
            },
        });
    } catch (err) {
        console.error("Payment verification error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


module.exports = router;
