const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadFields");
const { addCab, getCabById, getCabs ,cabList,cabExpensive} = require("../controllers/cabController");
const { authMiddleware, isAdmin} = require("../middleware/authMiddleware");

// Route to add a cab
router.post("/add",authMiddleware,isAdmin, upload, addCab);
router.get('/list', authMiddleware,isAdmin, cabList);
router.get('/cabExpensive', authMiddleware,isAdmin, cabExpensive);
router.get("/:cabNumber", authMiddleware,isAdmin, getCabById);
router.get("/", authMiddleware,isAdmin,getCabs);


module.exports = router;
