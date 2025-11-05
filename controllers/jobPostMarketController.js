
const { JobPostMarket, Admin } = require("../models");  // adjust path if needed
const { Op } = require('sequelize');


exports.createJobPostMarket = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { tripType } = req.body;

    let newJobPost;

    // ✅ One Way Trip
    if (tripType === "one-way") {
      const {
        name, phone, vehicleType, pickupDate, pickupTime,
        pickupLocation, dropoffLocation, distance
      } = req.body;

      if (!name || !phone || !vehicleType || !pickupDate || !pickupTime || !pickupLocation || !dropoffLocation || !distance) {
        return res.status(400).json({ success: false, message: "All fields are required for One Way Trip" });
      }

      newJobPost = await JobPostMarket.create({
        name, phone, tripType, vehicleType,
        pickupDate, pickupTime, pickupLocation, dropoffLocation, distance,
        addedBy: adminId,
      });

      // ✅ Round Trip
    } else if (tripType === "round-trip") {
      const {
        name, phone, vehicleType, distance,
        pickupDate, pickupTime, endDate, endTime, numberOfDays
      } = req.body;

      if (!name || !phone || !vehicleType || !distance || !pickupDate || !pickupTime || !endDate || !endTime || !numberOfDays) {
        return res.status(400).json({ success: false, message: "All fields are required for Round Trip" });
      }

      newJobPost = await JobPostMarket.create({
        name, phone, tripType, vehicleType,
        distance,
        startDate: pickupDate,   // ✅ map to DB
        startTime: pickupTime,
        endDate, endTime,
        noOfDays: numberOfDays,
        addedBy: adminId,
      });

      // ✅ Rental Trip (image fields)
    } else if (tripType === "rental") {
      const {
        name, phone, vehicleType, distance,
        rentalDateTime, rentalHours, fixedKM, extraHours, extraDistance
      } = req.body;

      if (!name || !phone || !vehicleType || !distance || !rentalDateTime || !rentalHours || !fixedKM) {
        return res.status(400).json({ success: false, message: "All required fields must be filled for Rental Trip" });
      }

      const [pickupDate, pickupTime] = rentalDateTime.split("T"); // ⬅️ extract date/time

      newJobPost = await JobPostMarket.create({
        name, phone, tripType, vehicleType,
        distance,
        pickupDate,
        pickupTime,
        rentalHours,
        fixedKM,
        extraHours: extraHours || 0,
        extraDistance: extraDistance || 0,
        addedBy: adminId,
      });


    } else {
      return res.status(400).json({ success: false, message: "Invalid Trip Type" });
    }

    // ✅ Success response
    res.status(201).json({
      success: true,
      message: "Job Post created successfully",
      data: newJobPost,
    });

  } catch (error) {
    console.error("❌ Error creating job post:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


exports.acceptJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const acceptedBy = req.admin.id;

    console.log('🔍 Accepting job:', jobId);
    console.log('🔍 Accepted by admin ID:', acceptedBy);
    console.log('🔍 req.admin:', req.admin);

    // Find the job
    const job = await JobPostMarket.findByPk(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    console.log('🔍 Current job status:', job.status);
    console.log('🔍 Current job acceptedBy:', job.acceptedBy);

    // Check if job is already accepted
    if (job.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: "Job is no longer available"
      });
    }

    // Update job status to accepted
    const updatedJob = await job.update({
      status: 'accepted',
      acceptedBy: acceptedBy
    });

    console.log('✅ Job accepted successfully');
    console.log('✅ Updated job:', updatedJob.toJSON());

    res.status(200).json({
      success: true,
      message: "Job accepted successfully",
      data: updatedJob
    });

  } catch (error) {
    console.error("❌ Error accepting job:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept job",
      error: error.message,
    });
  }
};


// ✅ Update your getJobMarket function to only show available jobs
exports.getJobMarket = async (req, res) => {
  try {
    // Only fetch available jobs (not accepted/completed/cancelled)
    const jobs = await JobPostMarket.findAll({
      where: {
        status: 'available'
      },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

exports.getAllJobMarket = async (req, res) => {
  try {
    // Fetch ALL jobs (no filtering by addedBy)
    const jobs = await JobPostMarket.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

// Get accepted jobs for a specific admin (Jobs I posted that were accepted by others)
exports.getAcceptedJobsByAdmin = async (req, res) => {
  try {
    const adminId = req.admin.id; // Use req.admin.id since that's what your auth middleware sets

    console.log("Fetching accepted jobs for admin ID:", adminId);

    const acceptedJobs = await JobPostMarket.findAll({
      where: {
        addedBy: adminId,
        status: "accepted"
      },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: acceptedJobs.length,
      data: acceptedJobs,
    });

  } catch (error) {
    console.error("❌ Error fetching accepted jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching accepted jobs",
      error: error.message,
    });
  }
};

exports.getJobsAcceptedByAdmin = async (req, res) => {
  try {
    const adminId = req.admin.id;
    console.log("🔍 Fetching jobs posted by admin ID:", adminId);

    const myPostedJobs = await JobPostMarket.findAll({
      where: {
        addedBy: adminId,       // ✅ sirf wahi jobs jinko current admin ne post kiya
        status: "accepted"      // ✅ aur wo jobs jo accept ho chuki hain
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Admin,
          as: "acceptedAdmin",   // jisne accept kiya uska detail dikhana ho to
          attributes: ["id", "name", "email", "phone"]
        }
      ]
    });

    console.log("✅ Found", myPostedJobs.length, "jobs posted by admin", adminId);

    res.status(200).json({
      success: true,
      count: myPostedJobs.length,
      data: myPostedJobs,
    });

  } catch (error) {
    console.error("❌ Error fetching my posted jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your posted jobs",
      error: error.message,
    });
  }
};


exports.getJobsAcceptedByAdmin1 = async (req, res) => {
  try {
    const adminId = req.admin.id;
    console.log("🔍 Fetching jobs accepted by admin ID:", adminId);

    const myAcceptedJobs = await JobPostMarket.findAll({
      where: {
        acceptedBy: adminId,
        status: "accepted"
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Admin,
          as: "acceptedAdmin",   // alias yahi hona chahiye jo model me diya hai
          attributes: ["id", "name", "email", "phone"]
        }
      ]
    });



    console.log("✅ Found", myAcceptedJobs.length, "jobs accepted by admin", adminId);

    res.status(200).json({
      success: true,
      count: myAcceptedJobs.length,
      data: myAcceptedJobs,
    });

  } catch (error) {
    console.error("❌ Error fetching my accepted jobs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your accepted jobs",
      error: error.message,
    });
  }
};

