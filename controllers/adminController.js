
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { Driver, Admin, CabsDetails,CabDetails,CabAssignment, Analytics } = require('../models');
require("dotenv").config();
const Expense = require("../models/subAdminExpenses");
// const Analytics = require("../models/SubadminAnalytics");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { Op } = require("sequelize");
const {Notification } = require("../models");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const addNewSubAdmin = async (req, res) => {
  try {
    const { name, email, role, phone, status, companyInfo } = req.body;
    // Optional package limit from master admin UI
    let { subscriptionCabLimit } = req.body;
    if (subscriptionCabLimit !== undefined) {
      const n = Number(subscriptionCabLimit);
      subscriptionCabLimit = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }
    console.log("response", req.body);

    const profileImage = req.files?.profileImage?.[0]?.path || null;
    const companyLogo = req.files?.companyLogo?.[0]?.path || null;
    const signature = req.files?.signature?.[0]?.path || null;

    // Basic validation
    if (!name || !email || !role || !phone || !companyInfo) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Check for existing email
    // const existingSubAdmin = await Admin.findOne({ where: { email } });
    const existingSubAdmin = await Admin.findOne({ where: { email } });

    if (existingSubAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Generate and hash password
    const generatedPassword = Math.random().toString(36).slice(-8);
    // const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create subadmin
    const newSubAdmin = await Admin.create({
      profileImage,
      name,
      email,
      password: generatedPassword,
      role,
      phone,
      status: status || "Active",
      companyLogo,
      companyInfo,
      signature,
      // Save selected package size if provided
      ...(subscriptionCabLimit !== undefined ? { subscriptionCabLimit } : {}),
    });

    // Optionally generate invoice number (if needed for display or testing)
    const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); //   Correct

    // Send welcome email
    const mailOptions = {
      from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
      to: email,
      subject: "Welcome to Route Budget- Sub-Admin Account Created",
      html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
          <div style="text-align: center; padding-bottom: 20px;">
            ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
          </div>
          <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${generatedPassword}</p>
          <p>Please log in and change your password after first login.</p>
          <br>
          <div style="text-align: center;">
            <a href="https://admin.routebudget.com/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Return response without password
    const { password: _, ...subAdminResponse } = newSubAdmin.toJSON();

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      newSubAdmin: subAdminResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add sub-admin",
      error: error.message,
    });
  }
};


//   Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin already exists
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already registered" });

// ---------------- In-memory micro-cache (short TTL) ----------------
// Helps reduce TTFB for hot endpoints over Wi-Fi/cellular by serving
// repeat requests from memory when data is unchanged.
const __microCache = new Map(); // key -> { ts, value }
const MICRO_TTL_MS = 8000; // 8s TTL is enough to smooth bursts while staying fresh

function mcGet(key) {
  const entry = __microCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MICRO_TTL_MS) {
    __microCache.delete(key);
    return null;
  }
  return entry.value;
}

function mcSet(key, value) {
  __microCache.set(key, { ts: Date.now(), value });
}

    //   Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

//   Sub-Admin Login ---- not used
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trim email and password to avoid white space errors
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Use lean() for performance (returns plain JS object, not full Mongoose doc)
    const admin = await Admin.findOne({ where: { email: email.trim() } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if blocked
    if (admin.status === "Blocked") {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Contact admin." });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.status(200).json({ message: "Login successful!", token, id: admin._id });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const totalSubAdminCount = async (req, res) => {
  try {
    // If you are counting admin documents
    const subAdminCount = await Admin.count({ where: { role: 'subadmin' }, });

    res.status(200).json({ count: subAdminCount }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalDriver = async (req, res) => {
  try {
    // If you are counting admin documents
    const driverCount = await Driver.count(); // Ensure this is the correct model for the task

    res.status(200).json({ count: driverCount }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalCab = async (req, res) => {
  try {
    // If you are counting admin documents
    const cab = await CabsDetails.count(); // Ensure this is the correct model for the task

    res.status(200).json({ count: cab }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting cabs" });
  }
};



// const getAllSubAdmins = async (req, res) => {
//   try {
//     const subAdmins = await Admin.findAll({
//       attributes: { exclude: ['password'] },
//       order: [['createdAt', 'DESC']],
//     });

//     const today = new Date();
//     const updatedSubAdmins = subAdmins.map((subAdmin) => {
//       let subscription = null;

//       if (subAdmin.subscriptionType) {
//         const endDate = new Date(subAdmin.subscriptionEnd);
//         const daysLeft = Math.max(
//           0,
//           Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
//         );

//         let status = "active";
//         if (today > endDate) {
//           status = "expired";
//         }

//         subscription = {
//           type: subAdmin.subscriptionType,
//           startDate: subAdmin.subscriptionStart,
//           endDate: subAdmin.subscriptionEnd,
//           daysLeft,
//           status,  // 
//           price: subAdmin.subscriptionPrice,
//         };
//       }

//       return {
//         ...subAdmin.toJSON(),
//         subscription,
//       };
//     });

//     res.status(200).json({ success: true, subAdmins: updatedSubAdmins });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch sub-admins',
//       error: error.message,
//     });
//   }
// };




// Invoice number generator


const getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    const today = new Date();
    
    // Get cab statistics for all subadmins
    const updatedSubAdmins = await Promise.all(
      subAdmins.map(async (subAdmin) => {
        let subscription = null;

        if (subAdmin.subscriptionType) {
          const endDate = new Date(subAdmin.subscriptionEnd);
          const daysLeft = Math.max(
            0,
            Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
          );

          let status = "active";
          if (today > endDate) {
            status = "expired";
          }

          subscription = {
            type: subAdmin.subscriptionType,
            startDate: subAdmin.subscriptionStart,
            endDate: subAdmin.subscriptionEnd,
            daysLeft,
            status,  // 
            price: subAdmin.subscriptionPrice,
          };
        }

        // Get cab statistics for this subadmin - ADDED THIS SECTION
        let cabStats = {
          totalDrivers: 0,
          totalCabs: 0,
          totalCabAssigned: 0
        };

        try {
          const totalDrivers = await Driver.count({
            where: { addedBy: subAdmin.id }
          });

          const totalCabs = await CabsDetails.count({
            where: { addedBy: subAdmin.id }
          });

          const totalCabAssigned = await CabAssignment.count({
            where: { assignedBy: subAdmin.id }
          });

          cabStats = {
            totalDrivers,
            totalCabs,
            totalCabAssigned
          };
        } catch (cabError) {
          console.error(`Error fetching cab stats for subadmin ${subAdmin.id}:`, cabError);
          // Keep default values if there's an error
        }

        return {
          ...subAdmin.toJSON(),
          subscription,
          cabStats  // 
        };
      })
    );

    res.status(200).json({ 
      success: true, 
      subAdmins: updatedSubAdmins 
    });
  } catch (error) {
    console.error("Error in getAllSubAdmins:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-admins',
      error: error.message,
    });
  }
};




const generateInvoiceNumber = (subadminName) => {
  if (!subadminName) return "NA-000000";

  const namePrefix = subadminName.trim().split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 3); // E.g., Radiant IT Service   RIS
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100;
  const nextYear = (now.getFullYear() + 1) % 100;
  const financialYear = currentMonth >= 4 ? `${currentYear}${nextYear}` : `${(currentYear - 1).toString().padStart(2, "0")}${currentYear}`;
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `${namePrefix}${financialYear}-${randomNumber}`;
};


// const getSubAdminById = async (req, res) => {
//   try {
//     const cacheKey = `sub:${req.params.id}`;

//     // Serve from micro-cache if present and client didn't explicitly bypass cache
//     try {
//       const cached = mcGet(cacheKey);
//       if (cached && req.headers['cache-control'] !== 'no-cache') {
//         if (cached.headers) {
//           if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
//           if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
//           if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
//         }
//         // Conditional GET
//         if (req.headers['if-none-match'] && cached.headers?.ETag && req.headers['if-none-match'] === cached.headers.ETag) {
//           return res.status(304).end();
//         }
//         if (req.headers['if-modified-since'] && cached.headers?.['Last-Modified']) {
//           const ifModSince = new Date(req.headers['if-modified-since']);
//           const lastMod = new Date(cached.headers['Last-Modified']);
//           if (!isNaN(ifModSince) && lastMod <= ifModSince) {
//             return res.status(304).end();
//           }
//         }
//         return res.status(200).json(cached.body);
//       }
//     } catch (_) {}

//     const subAdmin = await Admin.findByPk(req.params.id, {
//       attributes: { exclude: ['password'] },
//     });

//     if (!subAdmin) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Sub-admin not found" });
//     }

//     let subscription = null;
//     if (subAdmin.subscriptionType) {
//       const today = new Date();
//       const endDate = new Date(subAdmin.subscriptionEnd);
//       const daysLeft = Math.max(
//         0,
//         Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
//       );

//       let status = "active";
//       if (today > endDate) {
//         status = "expired";
//       }

//       subscription = {
//         type: subAdmin.subscriptionType,
//         startDate: subAdmin.subscriptionStart,
//         endDate: subAdmin.subscriptionEnd,
//         daysLeft,
//         status,  // 
//         price: subAdmin.subscriptionPrice,
//       };
//     }

//     // Lightweight private caching for faster TTFB
//     try {
//       const lastMod = subAdmin.updatedAt ? new Date(subAdmin.updatedAt) : new Date();
//       const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
//       const lastModUTC = lastMod.toUTCString();

//       // Generate a simple ETag from updatedAt + subscription fields
//       const etagBase = `${subAdmin.id}|${lastMod.getTime()}|${subscription?.type || 'none'}|${subscription?.endDate || ''}|${subscription?.price || ''}`;
//       const etag = crypto.createHash('md5').update(etagBase).digest('hex');

//       res.set('Cache-Control', cacheControl);
//       res.set('Last-Modified', lastModUTC);
//       res.set('ETag', etag);

//       // Conditional GET handling
//       if (req.headers['if-none-match'] === etag) {
//         return res.status(304).end();
//       }
//       const ifModSince = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
//       if (ifModSince && lastMod <= ifModSince) {
//         return res.status(304).end();
//       }

//       const payload = { success: true, subAdmin, subscription };
//       // Save to micro-cache (headers + body) for quick subsequent hits
//       mcSet(cacheKey, {
//         headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag },
//         body: payload,
//       });

//       return res.status(200).json(payload);
//     } catch (_) {
//       // Fallback: return without micro-cache if header logic fails
//       return res.status(200).json({ success: true, subAdmin, subscription });
//     }
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch sub-admin",
//       error: error.message,
//     });
//   }
// };

const getSubAdminById = async (req, res) => {
  try {
    const cacheKey = `sub:${req.params.id}`;

    // Serve from micro-cache if present
    try {
      const cached = mcGet(cacheKey);
      if (cached && req.headers['cache-control'] !== 'no-cache') {
        if (cached.headers) {
          if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
          if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
          if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
        }
        // Conditional GET
        if (req.headers['if-none-match'] && cached.headers?.ETag && req.headers['if-none-match'] === cached.headers.ETag) {
          return res.status(304).end();
        }
        if (req.headers['if-modified-since'] && cached.headers?.['Last-Modified']) {
          const ifModSince = new Date(req.headers['if-modified-since']);
          const lastMod = new Date(cached.headers['Last-Modified']);
          if (!isNaN(ifModSince) && lastMod <= ifModSince) {
            return res.status(304).end();
          }
        }
        return res.status(200).json(cached.body);
      }
    } catch (_) {}

    // Fetch sub-admin by ID with their notifications
    const subAdmin = await Admin.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Notification,
          as: "notifications",
          attributes: ["id", "recipientType", "message", "sentAt", "createdAt"],
        },
      ],
    });

    if (!subAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // Subscription calculation
    let subscription = null;
    if (subAdmin.subscriptionType) {
      const today = new Date();
      const endDate = new Date(subAdmin.subscriptionEnd);
      const daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
      let status = today > endDate ? "expired" : "active";

      subscription = {
        type: subAdmin.subscriptionType,
        startDate: subAdmin.subscriptionStart,
        endDate: subAdmin.subscriptionEnd,
        daysLeft,
        status,
        price: subAdmin.subscriptionPrice,
      };
    }

    // Lightweight caching for faster repeat hits
    try {
      const lastMod = subAdmin.updatedAt ? new Date(subAdmin.updatedAt) : new Date();
      const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
      const lastModUTC = lastMod.toUTCString();

      // Generate unique ETag
      const etagBase = `${subAdmin.id}|${lastMod.getTime()}|${subscription?.type || 'none'}|${subscription?.endDate || ''}|${subscription?.price || ''}`;
      const etag = crypto.createHash('md5').update(etagBase).digest('hex');

      res.set('Cache-Control', cacheControl);
      res.set('Last-Modified', lastModUTC);
      res.set('ETag', etag);

      // Conditional GET handling
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      const ifModSince = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
      if (ifModSince && lastMod <= ifModSince) {
        return res.status(304).end();
      }

      const payload = { success: true, subAdmin, subscription };
      // Save to micro-cache
      mcSet(cacheKey, {
        headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag },
        body: payload,
      });

      return res.status(200).json(payload);
    } catch (_) {
      // Fallback if header/cache fails
      return res.status(200).json({ success: true, subAdmin, subscription });
    }
  } catch (error) {
    console.error("Error fetching sub-admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admin",
      error: error.message,
    });
  }
};


const updateSubAdmin = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id);
    const {
      name,
      email,
      password,
      role,
      phone,
      status,
      companyInfo,
      companyLogo,
      signature,
      // Optional package size update
      subscriptionCabLimit,
    } = req.body;

    console.log("Updating subadmin with ID:", subAdminId);
    console.log("Body:", req.body);
    console.log("Files:", Object.keys(req.files || {}));

    // 1. Check if sub-admin exists
    const existingSubAdmin = await Admin.findByPk(subAdminId);
    if (!existingSubAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // 2. Check for duplicate email
    if (email) {
      const duplicateEmail = await Admin.findOne({
        where: {
          email,
          id: { [Op.ne]: subAdminId },
        },
      });
      if (duplicateEmail) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    // 3. Build updateData
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (phone) updateData.phone = phone;
    if (status) updateData.status = status;
    if (companyInfo) updateData.companyInfo = companyInfo;
    if (companyLogo) updateData.companyLogo = companyLogo;
    if (signature) updateData.signature = signature;
    // Handle package size if provided
    if (subscriptionCabLimit !== undefined) {
      const n = Number(subscriptionCabLimit);
      updateData.subscriptionCabLimit = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }

    // Handle multipart uploads via uploadFields middleware
    // Prefer newly uploaded files over body values if present
    const uploadedProfile = req.files?.profileImage?.[0]?.path;
    const uploadedLogo = req.files?.companyLogo?.[0]?.path;
    const uploadedSignature = req.files?.signature?.[0]?.path;

    if (uploadedProfile) updateData.profileImage = uploadedProfile;
    if (uploadedLogo) updateData.companyLogo = uploadedLogo;
    if (uploadedSignature) updateData.signature = uploadedSignature;

    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    console.log("Updating with data:", updateData);

    // 4. Update
    await existingSubAdmin.update(updateData);

    const result = existingSubAdmin.toJSON();
    delete result.password;

    // Fix image URLs only if they are not from Cloudinary or already absolute
    const makeFullUrl = (value) => {
      if (value && !value.startsWith("http")) {
        return `${req.protocol}://${req.get("host")}${value}`;
      }
      return value;
    };

    result.profileImage = makeFullUrl(result.profileImage);
    result.companyLogo = makeFullUrl(result.companyLogo);
    result.signature = makeFullUrl(result.signature);

    return res.status(200).json({
      success: true,
      message: "Sub-admin updated successfully",
      subAdmin: result,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update sub-admin",
      error: error.message,
    });
  }
};

const deleteSubAdmin = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id);

    // 1. Check if sub-admin exists
    const subAdmin = await Admin.findByPk(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // 2. Delete related Cabs and Drivers (if your models have `addedBy` field)
    const deletedCabs = await CabsDetails.destroy({ where: { addedBy: subAdminId } });
    const deletedDrivers = await Driver.destroy({ where: { addedBy: subAdminId } });

    // 3. Delete Sub-Admin
    await subAdmin.destroy();

    // 4. Send response
    res.status(200).json({
      success: true,
      message: "Sub-admin and related cabs and drivers deleted successfully, if any",
      deletedSubAdmin: subAdmin, // The deleted sub-admin record
      deletedCabs: deletedCabs, // number of deleted cabs
      deletedDrivers: deletedDrivers, // number of deleted drivers
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-admin and related data",
      error: error.message,
    });
  }
};


const toggleBlockStatus = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id); // Ensure it's a number if your ID is integer

    // Find the sub-admin
    const subAdmin = await Admin.findByPk(subAdminId);

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found",
      });
    }

    // Toggle status
    const newStatus = subAdmin.status === "Active" ? "Inactive" : "Active";

    // Update status
    await Admin.update(
      { status: newStatus },
      { where: { id: subAdminId } }
    );

    // Refetch the updated subAdmin without password
    const updatedSubAdmin = await Admin.findByPk(subAdminId, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      message: `Sub-admin ${newStatus === "Active" ? "activated" : "deactivated"} successfully`,
      status: newStatus,
      subAdmin: updatedSubAdmin,
    });

  } catch (error) {
    console.error("Toggle Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sub-admin status",
      error: error.message,
    });
  }
};

const addExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;

    const newExpense = new Expense({ type, amount, driver, cabNumber });

    await newExpense.save();

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an expense
const updateExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { type, amount, driver, cabNumber },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    // Fetch latest 10 analytics records sorted by date DESC
    const data = await Analytics.findAll({
      order: [["date", "DESC"]], // Sequelize equivalent of sort({ date: -1 })
      limit: 10
    });

    res.json(data);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// const addAnalytics = async (req, res) => {
//   try {
//     const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
//       req.body;
//        const newEntry = await Analytics.create({
//       totalRides,
//       revenue,
//       customerSatisfaction,
//       fleetUtilization
//     });
//     res.status(201).json(newEntry);
//   } catch (error) {
//     res.status(500).json({ message: "Error adding data" });
//   }
// };

const addAnalytics = async (req, res) => {
  try {
    const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
      req.body;

    const newEntry = await Analytics.create({
      totalRides,
      revenue,
      customerSatisfaction,
      fleetUtilization,
    });

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error in addAnalytics:", error);
    res.status(500).json({ success: false, message: "Error adding data" });
  }
};



// const getSubadminExpenses = async (req, res) => {
//   try {
//     // Fetch all required data in parallel to improve performance
//     const [subadmins, trips, drivers, cabDetails] = await Promise.all([
//       Admin.find(),
//       Cab.find().populate('cab').populate('assignedBy').populate("driver"),
//       Driver.find(),
//       CabDetails.find(),
//     ]);

//     if (!trips || trips.length === 0) {
//       return res.status(404).json({ success: false, message: "No trips found!" });
//     }

//     // Aggregate expenses by subadmin
//     const subadminExpenseMap = new Map();

//     // Process each trip to calculate expenses
//     trips.forEach((trip) => {
//       const subadminId = trip.assignedBy?._id?.toString();
//       const subadminName = trip.assignedBy?.name || "N/A";

//       if (!subadminId) return; // Skip trips without a valid subadmin

//       // Calculate expenses for this trip
//       const fuel = trip.tripDetails?.fuel?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const fastTag = trip.tripDetails?.fastTag?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const tyrePuncture = trip.tripDetails?.tyrePuncture?.repairAmount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const otherProblems = trip.tripDetails?.otherProblems?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const totalExpense = fuel + fastTag + tyrePuncture + otherProblems;

//       // Initialize or update the subadmin's data in the map
//       if (!subadminExpenseMap.has(subadminId)) {
//         subadminExpenseMap.set(subadminId, {
//           SubAdmin: subadminName,
//           totalExpense: 0,
//           breakdown: { fuel: 0, fastTag: 0, tyrePuncture: 0, otherProblems: 0 },
//           tripCount: 0,
//         });
//       }

//       const subadminData = subadminExpenseMap.get(subadminId);
//       subadminData.totalExpense += totalExpense;
//       subadminData.breakdown.fuel += fuel;
//       subadminData.breakdown.fastTag += fastTag;
//       subadminData.breakdown.tyrePuncture += tyrePuncture;
//       subadminData.breakdown.otherProblems += otherProblems;
//       subadminData.tripCount += 1;
//     });

//     // Calculate total drivers and cabs per subadmin
//     subadminExpenseMap.forEach((subadminData, subadminId) => {
//       // Count drivers for this subadmin
//       const totalDrivers = drivers.filter(driver =>
//         driver.addedBy?._id?.toString() === subadminId
//       ).length;

//       // Count cabs for this subadmin
//       const totalCabs = cabDetails.filter(cabDetail =>
//         cabDetail.addedBy?.toString() === subadminId
//       ).length;

//       subadminData.totalDrivers = totalDrivers;
//       subadminData.totalCabs = totalCabs;
//     });

//     // Convert the map to an array and sort by total expense
//     const expenses = Array.from(subadminExpenseMap.values()).sort((a, b) => b.totalExpense - a.totalExpense);

//     if (expenses.length === 0) {
//       return res.status(404).json({ success: false, message: "No expenses found after calculation!" });
//     }

//     res.status(200).json({ success: true, data: expenses });
//   } catch (error) {
//     console.error("Error in getSubadminExpenses:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


const getSubadminExpenses = async (req, res) => {
  try {
    // Fetch all relevant data in parallel
    const [subadmins, assignments, drivers, cabDetails] = await Promise.all([
      Admin.findAll(),
      CabAssignment.findAll({
        include: [Driver, Admin], // Driver assigned + Admin who assigned
      }),
      Driver.findAll(),           // all drivers
      CabsDetails.findAll(),      // all cabs
    ]);

    if (!assignments || assignments.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No cab assignments found!" });
    }

    const subadminExpenseMap = new Map();

    // Calculate expenses per subadmin
    assignments.forEach((assignment) => {
      const subadminId = assignment.assignedBy;
      const subadminName = assignment.Admin?.name || "N/A";
      if (!subadminId) return;

      const sumArray = (arr) =>
        Array.isArray(arr) ? arr.reduce((a, b) => a + (b || 0), 0) : Number(arr) || 0;

      const fuel = sumArray(assignment.fuelAmount);
      const fastTag = sumArray(assignment.fastTagAmount);
      const tyrePuncture = sumArray(assignment.tyreRepairAmount);
      const servicing = sumArray(assignment.servicingAmount);
      const otherProblems = sumArray(assignment.otherAmount);

      const totalExpense = fuel + fastTag + tyrePuncture + servicing + otherProblems;

      if (!subadminExpenseMap.has(subadminId)) {
        subadminExpenseMap.set(subadminId, {
          SubAdmin: subadminName,
          totalExpense: 0,
          breakdown: {
            fuel: 0,
            fastTag: 0,
            tyrePuncture: 0,
            servicing: 0,
            otherProblems: 0,
          },
          tripCount: 0,
        });
      }

      const subadminData = subadminExpenseMap.get(subadminId);
      subadminData.totalExpense += totalExpense;
      subadminData.breakdown.fuel += fuel;
      subadminData.breakdown.fastTag += fastTag;
      subadminData.breakdown.tyrePuncture += tyrePuncture;
      subadminData.breakdown.servicing += servicing;
      subadminData.breakdown.otherProblems += otherProblems;
      subadminData.tripCount += 1;
    });

    // Add driver & cab counts per subadmin
    subadminExpenseMap.forEach((subadminData, subadminId) => {
      const totalDrivers = drivers.filter(d => d.adminId === subadminId).length;
      const totalCabs = cabDetails.filter(cab => cab.addedBy === subadminId).length;

      subadminData.totalDrivers = totalDrivers;
      subadminData.totalCabs = totalCabs;
    });

    const expenses = Array.from(subadminExpenseMap.values()).sort(
      (a, b) => b.totalExpense - a.totalExpense
    );

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No expenses found after calculation!",
      });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Error in getSubadminExpenses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};





const getAllExpenses = async (req, res) => {
  try {
    // Fetch all cab assignments with SubAdmin info
    const assignments = await CabAssignment.findAll({
      include: [Admin], // 👈 no alias now
    });

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cab assignments found.",
      });
    }

    // Subadmin wise expense aggregation
    const subadminExpenseMap = new Map();

    assignments.forEach((assignment) => {
      const subadminId = assignment.assignedBy; // foreign key column
      const subadminName = assignment.Admin?.name || "Unknown";

      if (!subadminId) return;

      // Helper: sum array safely
      const sumArray = (arr) =>
        Array.isArray(arr) ? arr.reduce((a, b) => a + (b || 0), 0) : Number(arr) || 0;

      const fuelTotal = sumArray(assignment.fuelAmount);
      const fastTagTotal = sumArray(assignment.fastTagAmount);
      const tyreTotal = sumArray(assignment.tyreRepairAmount);
      const servicingTotal = sumArray(assignment.servicingAmount);
      const otherTotal = sumArray(assignment.otherAmount);

      const totalExpense =
        fuelTotal + fastTagTotal + tyreTotal + servicingTotal + otherTotal;

      // Initialize subadmin if not exists
      if (!subadminExpenseMap.has(subadminId)) {
        subadminExpenseMap.set(subadminId, {
          subadminId,
          subadminName,
          totalExpense: 0,
          breakdown: {
            fuel: 0,
            fastTag: 0,
            tyrePuncture: 0,
            servicing: 0,
            otherProblems: 0,
          },
          totalTrips: 0,
        });
      }

      // Update aggregation
      const data = subadminExpenseMap.get(subadminId);
      data.totalExpense += totalExpense;
      data.breakdown.fuel += fuelTotal;
      data.breakdown.fastTag += fastTagTotal;
      data.breakdown.tyrePuncture += tyreTotal;
      data.breakdown.servicing += servicingTotal;
      data.breakdown.otherProblems += otherTotal;
      data.totalTrips += 1;
    });

    // Convert map → array and sort by expense
    const expenses = Array.from(subadminExpenseMap.values()).sort(
      (a, b) => b.totalExpense - a.totalExpense
    );

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Error in getAllExpenses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//   Export all functions correctly
module.exports = {
  registerAdmin,
  adminLogin,
  totalSubAdminCount,
  getAllSubAdmins,
  addNewSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  toggleBlockStatus,
  totalDriver,
  totalCab,
  addExpense,
  getAllExpenses,
  deleteExpense,
  updateExpense,
  getAnalytics,
  addAnalytics,
  getSubadminExpenses
};