// const express = require("express");
// const SubAdmin = require("../models/subAdminPermissions");
// const router = express.Router();

// // Create or Update Sub-Admin Permissions
// router.post("/sub-admin", async (req, res) => {
//   try {
//     const { subAdminId, name, permissions } = req.body;

//     // if (!subAdminId || !name) {
//     //   return res.status(400).json({ error: "Sub-admin ID and name are required" });
//     // }

//     let subAdmin = await SubAdmin.findOne({ subAdminId });

//     if (subAdmin) {
//       // Update existing sub-admin
//       subAdmin.name = name;
//       subAdmin.permissions = permissions;
//       await subAdmin.save();
//       return res.json({ message: "Permissions updated", subAdmin });
//     }

//     // Create a new sub-admin
//     subAdmin = new SubAdmin({ subAdminId, name, permissions });
//     await subAdmin.save();
//     res.status(201).json({ message: "Sub-admin created", subAdmin });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// // Get all sub-admins
// router.get("/sub-admins", async (req, res) => {
//   try {
//     const subAdmins = await SubAdmin.find();
//     res.json(subAdmins);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// // Get a single sub-admin by ID
// router.get("/sub-admin/:subAdminId", async (req, res) => {
//   try {
//     const subAdmin = await SubAdmin.findOne({
//       subAdminId: req.params.subAdminId,
//     });
//     if (!subAdmin)
//       return res.status(404).json({ error: "Sub-admin not found" });
//     res.json(subAdmin);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;



const express = require("express");
const SubAdmin = require("../models/subAdminPermissions");
const router = express.Router();

// Create or Update Sub-Admin Permissions
router.post("/sub-admin", async (req, res) => {
  try {
    const { subAdminId, name, permissions } = req.body;

    // if (!subAdminId || !name) {
    //   return res.status(400).json({ error: "Sub-admin ID and name are required" });
    // }

    let subAdmin = await SubAdmin.findOne({ subAdminId });

    if (subAdmin) {
      // Update existing sub-admin
      subAdmin.name = name;
      subAdmin.permissions = permissions;
      await subAdmin.save();
      return res.json({ message: "Permissions updated", subAdmin });
    }

    // Create a new sub-admin
    subAdmin = new SubAdmin({ subAdminId, name, permissions });
    await subAdmin.save();
    res.status(201).json({ message: "Sub-admin created", subAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all sub-admins
router.get("/sub-admins", async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find();
    res.json(subAdmins);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a single sub-admin by ID
router.get("/sub-admin/:subAdminId", async (req, res) => {
  try {
    const subAdmin = await SubAdmin.findOne({
      subAdminId: req.params.subAdminId,
    });
    if (!subAdmin)
      return res.status(404).json({ error: "Sub-admin not found" });
    res.json(subAdmin);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
