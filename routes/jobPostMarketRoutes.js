
const express = require("express");
const router = express.Router();
const { createJobPostMarket, getJobMarket,acceptJob,getAllJobMarket,getAcceptedJobsByAdmin,getJobsAcceptedByAdmin, getJobsAcceptedByAdmin1 } = require("../controllers/jobPostMarketController");
const {authMiddleware,isAdmin} = require("../middleware/authMiddleware");

// Admin protected routes
router.post("/job-post", authMiddleware,isAdmin,createJobPostMarket);
// GET API - Get all available jobs
router.get("/jobs", authMiddleware, isAdmin, getJobMarket);
router.get("/getAlljobs", getAllJobMarket);
router.put("/accept-job/:jobId", authMiddleware, isAdmin, acceptJob);




router.get('/my-posted-accepted-jobs',authMiddleware, isAdmin, getAcceptedJobsByAdmin);

// Get jobs accepted by current admin (for TripLog page)
router.get('/my-accepted-jobs',authMiddleware, isAdmin,getJobsAcceptedByAdmin);
router.get('/my-accepted-jobs1',authMiddleware, isAdmin,getJobsAcceptedByAdmin1);


module.exports = router;