// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { sendNotification, getNotifications } = require("../controllers/notificationController");

router.post("/send", sendNotification); // send notification
router.get("/list", getNotifications);   // fetch all notifications

module.exports = router;