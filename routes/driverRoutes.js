
const express = require("express");
const {Driver} = require("../models/");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

//  Get All Drivers Assigned to an Admin
router.get("/profile", authMiddleware, isAdmin, async (req, res) => {       // DONE
    try {
        const adminId = req.admin.id; // Get logged-in admin's ID

        // Fetch only drivers assigned to this admin
        const drivers = await Driver.findAll({
            where: { addedBy: adminId }
        });

        res.status(200).json(drivers);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

//  Update Driver Profile (Only Owner Admin or Super Admin)
router.put("/profile/:id", authMiddleware, async (req, res) => {    // DONE
  try {
    const adminId = req.admin.id;
    const adminRole = req.admin.role;
    const driverId = req.params.id;

    // Find the driver by ID
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Check if the admin updating is the one who added the driver OR is a super admin
    if (driver.addedBy !== adminId && adminRole !== "super-admin") {
      return res.status(403).json({
        message: "Unauthorized: You can only update drivers you added",
      });
    }

    // Update the driver
    await driver.update(req.body); // this updates the record

    // Don't include password in the response
    const { password, ...driverData } = driver.get({ plain: true });

    res.status(200).json({
      message: "Driver profile updated successfully",
      updatedDriver: driverData,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



//  Delete Driver Profile & Remove Image from Cloudinary

router.delete("/profile/:id", authMiddleware, async (req, res) => {       //Done
  try {
    const adminId = req.admin.id;
    const adminRole = req.admin.role;
    const driverId = req.params.id;

    // Find the driver by ID
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    // Authorization: Only the admin who added or super-admin can delete
    if (driver.addedBy !== adminId && adminRole !== "super-admin") {
      return res.status(403).json({
        message: "Unauthorized: You can only delete drivers you added",
      });
    }

    //  Delete the driver image from Cloudinary
    if (driver.imageId) {
      await cloudinary.uploader.destroy(driver.imageId);
    }

    // Delete the driver from database
    await driver.destroy();

    res.json({ message: "Driver and image deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});     


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    // PostgreSQL query via Sequelize
    const driver = await Driver.findOne({ where: { email } });

    if (!driver) {
      return res.status(404).json({ message: "Driver with this email does not exist" });
    }

    // Let frontend know driver exists → proceed to reset page
    res.status(200).json({
      message: "Driver verified. Proceed to set new password",
      driverId: driver.id
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { driverId, newPassword } = req.body;

    if (!driverId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "Invalid request. Password must be at least 6 characters."
      });
    }

    const driver = await Driver.findByPk(driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Update password
    driver.password = newPassword; // Ideally hash karna chahiye
    await driver.save();

    res.status(200).json({
      message: "Password updated successfully. You can now log in."
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



module.exports = router;
