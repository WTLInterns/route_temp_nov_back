
const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const uploadFields = require ("../middleware/uploadFields")
const {authMiddleware} = require ("../middleware/authMiddleware")

// Admin & Subadmin Controllers
const {
  adminLogin,
  registerAdmin,
  totalSubAdminCount,
  getAllSubAdmins,
  addNewSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  toggleBlockStatus,
  totalDriver,
  totalCab,
  getAllExpenses,
  getSubadminExpenses,
  getAnalytics,
  addAnalytics,
  
} = require("../controllers/adminController");


// Email-related Controllers
const {sendSubAdminEmail,loginSubAdmin,startFreeTrial,buyPaidSubscription,getSubscriptionStatus,getFreeTrialSubAdmins,getPaidSubAdmins} = require("../controllers/emailController");

router.post("/addNewSubAdmin", uploadFields, addNewSubAdmin);
router.post("/login", loginSubAdmin);
router.post("/startFreeTrial", authMiddleware, startFreeTrial);
router.post("/buyPaidSubscription", authMiddleware, buyPaidSubscription);
router.get("/getSubscription",authMiddleware,getSubscriptionStatus)


router.get("/get-paid-subAdmins", getPaidSubAdmins);
router.get("/get-free-trial-subAdmins", getFreeTrialSubAdmins);




router.get("/sub-admin-count", totalSubAdminCount);
router.get("/getAllSubAdmins", getAllSubAdmins);
router.get("/getSubAdmin/:id", getSubAdminById);
router.put("/updateSubAdmin/:id", uploadFields, updateSubAdmin);
router.delete("/deleteSubAdmin/:id", deleteSubAdmin);
router.put("/toggle-block/:id", toggleBlockStatus);


router.get("/", getAnalytics);        // Get latest analytics (limit 10)
router.post("/", addAnalytics);       // Add new analytics record

router.get("/driver-count", totalDriver);
router.get("/cab-count", totalCab);
router.get("/getExpense", getAllExpenses);

router.get("/subadmin-expenses", getSubadminExpenses);

router.get("/revenue",addAnalytics)

router.post("/send", sendSubAdminEmail);


router.post("/upload-profile", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded!" });
    }

    res.json({
      message: "File uploaded successfully!",
      fileUrl: req.file.path,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", registerAdmin);
router.post("/login", adminLogin);


module.exports = router;

