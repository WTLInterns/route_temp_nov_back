// const bcrypt = require('bcrypt');
// const { MasterAdmin } = require('../models');  // Correct the model to MasterAdmin
// const SubAdmin = require('../models/Admin');
// const { Resend } = require("resend");
// const Driver = require("../models/loginModel");
// const CabDetails = require("../models/CabsDetails");
// const CabAssigned = require("../models/CabAssignment");

// const resend = new Resend(process.env.RESEND_API_KEY);

// // Register Master Admin (not regular admin)
// // exports.registerMasterAdmin = async (req, res) => {
// //     try {
// //         const { name, email, password } = req.body;
// //         // const masterAdminId = mongoose.Types.ObjectId('67d9d463bab97703a18d886d'); 

// //         // Check if Master Admin already exists
// //         let existingMasterAdmin = await MasterAdmin.findOne({ email });
// //         if (existingMasterAdmin) return res.status(400).json({ message: "Master Admin already registered" });

// //         // Hash the password before saving
// //         const hashedPassword = await bcrypt.hash(password, 10);
// //         const newMasterAdmin = new MasterAdmin({ name, email, password: hashedPassword});

// //         await newMasterAdmin.save();

// //         res.status(201).json({ message: "Master Admin registered successfully" });
// //     } catch (error) {
// //         res.status(500).json({ message: "Server Error" });
// //     }
// // };

// exports.registerMasterAdmin = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     // Check if Master Admin already exists
//     const existingMasterAdmin = await MasterAdmin.findOne({ where: { email } });
//     if (existingMasterAdmin) {
//       return res.status(400).json({ message: "Master Admin already registered" });
//     }

//     // Create new master admin (password will be hashed in the model hook)
//     const newMasterAdmin = await MasterAdmin.create({
//       name,
//       email,
//       password,
//     });

//     res.status(201).json({ message: "Master Admin registered successfully", admin: newMasterAdmin });
//   } catch (error) {
//     console.error("Register Error:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };


// // Admin Login (for Master Admin)
// // exports.adminLogin = async (req, res) => {
// //   try {
// //     const { email, password } = req.body;

// //     // Check if Master Admin exists
// //     const masterAdmin = await MasterAdmin.findOne({ email });
// //     if (!masterAdmin) return res.status(404).json({ message: "Master Admin not found" });

// //     // Compare hashed password with entered password
// //     const isMatch = await bcrypt.compare(password, masterAdmin.password);
// //     if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

// //     res.status(200).json({ message: "Login successfully" });
// //   } catch (error) {
// //     res.status(500).json({ message: "Server Error" });
// //   }
// // };

// exports.adminLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 🔍 Find the admin by email using Sequelize
//     const masterAdmin = await MasterAdmin.findOne({ where: { email } });
//     if (!masterAdmin) {
//       return res.status(404).json({ message: "Master Admin not found" });
//     }

//     // 🔐 Compare passwords using the model method
//     const isMatch = await masterAdmin.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // ✅ Login success
//     res.status(200).json({ message: "Login successfully" });

//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };


// // Generate 6-digit OTP
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };


// // 📩 Send OTP
// // exports.sendOTP = async (req, res) => {
// //   const { email } = req.body;

// //   if (!email) return res.status(400).json({ message: "Email is required" });

// //   try {
// //     const user = await MasterAdmin.findOne({ email });
// //     if (!user) return res.status(404).json({ message: "User not found" });

// //     const otp = generateOTP();

// //     const expiry = new Date();
// //     expiry.setMinutes(expiry.getMinutes() + 10); // 10 mins validity

// //     await MasterAdmin.findByIdAndUpdate(user._id, {
// //       resetOTP: otp,
// //       resetOTPExpiry: expiry,
// //     });

// //     await resend.emails.send({
// //       from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
// //       to: email,
// //       subject: "Password Reset OTP",
// //       html: `
// //         <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
// //           <h2>Password Reset Request</h2>
// //           <p>Your OTP is:</p>
// //           <div style="font-size: 32px; font-weight: bold; color: #1e90ff;">${otp}</div>
// //           <p>This OTP is valid for 10 minutes.</p>
// //         </div>
// //       `,
// //     });

// //     return res.status(200).json({ message: "OTP sent to your email" });
// //   } catch (err) {
// //     return res.status(500).json({ message: "Internal Server Error" });
// //   }
// // };

// exports.sendOTP = async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.status(400).json({ message: "Email is required" });

//   try {
//     const user = await MasterAdmin.findOne({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = generateOTP();

//     const expiry = new Date();
//     expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes

//     await MasterAdmin.update(
//       { resetOTP: otp, resetOTPExpiry: expiry },
//       { where: { id: user.id } }
//     );

//     await resend.emails.send({
//       from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
//       to: email,
//       subject: "Password Reset OTP",
//       html: `
//         <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
//           <h2>Password Reset Request</h2>
//           <p>Your OTP is:</p>
//           <div style="font-size: 32px; font-weight: bold; color: #1e90ff;">${otp}</div>
//           <p>This OTP is valid for 10 minutes.</p>
//         </div>
//       `,
//     });

//     return res.status(200).json({ message: "OTP sent to your email" });
//   } catch (err) {
//     console.error("Send OTP Error:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };


// // ✅ Verify OTP
// // exports.verifyOTP = async (req, res) => {
// //   const { email, otp } = req.body;

// //   if (!email || !otp)
// //     return res.status(400).json({ message: "Email and OTP are required" });

// //   try {
// //     const user = await MasterAdmin.findOne({email });
// //     if (!user) return res.status(404).json({ message: "User not found" });

// //     if (user.resetOTP !== otp)
// //       return res.status(400).json({ message: "Invalid OTP" });

// //     if (new Date() > user.resetOTPExpiry)
// //       return res.status(400).json({ message: "OTP has expired" });

// //     return res.status(200).json({ message: "OTP verified successfully" });
// //   } catch (err) {
// //     return res.status(500).json({ message: "Internal Server Error" });
// //   }
// // };

// exports.verifyOTP = async (req, res) => {
//   const { email, otp } = req.body;

//   if (!email || !otp)
//     return res.status(400).json({ message: "Email and OTP are required" });

//   try {
//     const user = await MasterAdmin.findOne({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.resetOTP !== otp)
//       return res.status(400).json({ message: "Invalid OTP" });

//     if (new Date() > user.resetOTPExpiry)
//       return res.status(400).json({ message: "OTP has expired" });

//     return res.status(200).json({ message: "OTP verified successfully" });
//   } catch (err) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// // 🔐 Reset Password
// // exports.resetPassword = async (req, res) => {
// //   const { email, password } = req.body;

// //   if (!email || !password)
// //     return res.status(400).json({ message: "Email and password are required" });

// //   try {
// //     const user = await MasterAdmin.findOne({ email });
// //     if (!user) return res.status(404).json({ message: "User not found" });

// //     const hashedPassword = await bcrypt.hash(password, 12);

// //     await MasterAdmin.findByIdAndUpdate(user._id, {
// //       password: hashedPassword,
// //       resetOTP: null,
// //       resetOTPExpiry: null,
// //     });

// //     return res.status(200).json({ message: "Password reset successful" });
// //   } catch (err) {
// //     return res.status(500).json({ message: "Internal Server Error" });
// //   }

// // };

// exports.resetPassword = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password)
//     return res.status(400).json({ message: "Email and password are required" });

//   try {
//     const user = await MasterAdmin.findOne({ where: { email } });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const hashedPassword = await bcrypt.hash(password, 12);

//     await MasterAdmin.update(
//       {
//         password: hashedPassword,
//         resetOTP: null,
//         resetOTPExpiry: null,
//       },
//       { where: { id: user.id } }
//     );

//     return res.status(200).json({ message: "Password reset successful" });
//   } catch (err) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }

// };

// exports.getCabDetails = async (req, res) => {
//   try {
//     const adminId = req.query.admin;// Get logged-in admin's

//     // Fetch only drivers assigned to this admin
//     const drivers = await Driver.find({ addedBy: adminId });
//     const cabs = await CabDetails.find({ addedBy: adminId });
//     const assignedCabs = await CabAssigned.find({ assignedBy: adminId });

//     res.status(200).json({

//       totalDrivers: drivers.length,

//       totalCabs: cabs.length,

//       totalCabAssigned: assignedCabs.length
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };










/**team code */
const bcrypt = require('bcrypt');
const { MasterAdmin } = require('../models');  // Correct the model to MasterAdmin
const SubAdmin = require('../models/Admin');
const { Resend } = require("resend");
const { Driver, CabsDetails, CabAssignment } = require("../models");


const resend = new Resend(process.env.RESEND_API_KEY);

// Register Master Admin (not regular admin)
// exports.registerMasterAdmin = async (req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         // const masterAdminId = mongoose.Types.ObjectId('67d9d463bab97703a18d886d'); 

//         // Check if Master Admin already exists
//         let existingMasterAdmin = await MasterAdmin.findOne({ email });
//         if (existingMasterAdmin) return res.status(400).json({ message: "Master Admin already registered" });

//         // Hash the password before saving
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newMasterAdmin = new MasterAdmin({ name, email, password: hashedPassword});

//         await newMasterAdmin.save();

//         res.status(201).json({ message: "Master Admin registered successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server Error" });
//     }
// };

exports.registerMasterAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if Master Admin already exists
    const existingMasterAdmin = await MasterAdmin.findOne({ where: { email } });
    if (existingMasterAdmin) {
      return res.status(400).json({ message: "Master Admin already registered" });
    }

    // Create new master admin (password will be hashed in the model hook)
    const newMasterAdmin = await MasterAdmin.create({
      name,
      email,
      password,
    });

    res.status(201).json({ message: "Master Admin registered successfully", admin: newMasterAdmin });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// Admin Login (for Master Admin)
// exports.adminLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check if Master Admin exists
//     const masterAdmin = await MasterAdmin.findOne({ email });
//     if (!masterAdmin) return res.status(404).json({ message: "Master Admin not found" });

//     // Compare hashed password with entered password
//     const isMatch = await bcrypt.compare(password, masterAdmin.password);
//     if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

//     res.status(200).json({ message: "Login successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Find the admin by email using Sequelize
    const masterAdmin = await MasterAdmin.findOne({ where: { email } });
    if (!masterAdmin) {
      return res.status(404).json({ message: "Master Admin not found" });
    }

    // 🔐 Compare passwords using the model method
    const isMatch = await masterAdmin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Login success
    res.status(200).json({ message: "Login successfully" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// 📩 Send OTP
// exports.sendOTP = async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.status(400).json({ message: "Email is required" });

//   try {
//     const user = await MasterAdmin.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = generateOTP();

//     const expiry = new Date();
//     expiry.setMinutes(expiry.getMinutes() + 10); // 10 mins validity

//     await MasterAdmin.findByIdAndUpdate(user._id, {
//       resetOTP: otp,
//       resetOTPExpiry: expiry,
//     });

//     await resend.emails.send({
//       from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
//       to: email,
//       subject: "Password Reset OTP",
//       html: `
//         <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
//           <h2>Password Reset Request</h2>
//           <p>Your OTP is:</p>
//           <div style="font-size: 32px; font-weight: bold; color: #1e90ff;">${otp}</div>
//           <p>This OTP is valid for 10 minutes.</p>
//         </div>
//       `,
//     });

//     return res.status(200).json({ message: "OTP sent to your email" });
//   } catch (err) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await MasterAdmin.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes

    await MasterAdmin.update(
      { resetOTP: otp, resetOTPExpiry: expiry },
      { where: { id: user.id } }
    );

    await resend.emails.send({
      from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
          <h2>Password Reset Request</h2>
          <p>Your OTP is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #1e90ff;">${otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


// ✅ Verify OTP
// exports.verifyOTP = async (req, res) => {
//   const { email, otp } = req.body;

//   if (!email || !otp)
//     return res.status(400).json({ message: "Email and OTP are required" });

//   try {
//     const user = await MasterAdmin.findOne({email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.resetOTP !== otp)
//       return res.status(400).json({ message: "Invalid OTP" });

//     if (new Date() > user.resetOTPExpiry)
//       return res.status(400).json({ message: "OTP has expired" });

//     return res.status(200).json({ message: "OTP verified successfully" });
//   } catch (err) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const user = await MasterAdmin.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.resetOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ message: "OTP has expired" });

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔐 Reset Password
// exports.resetPassword = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password)
//     return res.status(400).json({ message: "Email and password are required" });

//   try {
//     const user = await MasterAdmin.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const hashedPassword = await bcrypt.hash(password, 12);

//     await MasterAdmin.findByIdAndUpdate(user._id, {
//       password: hashedPassword,
//       resetOTP: null,
//       resetOTPExpiry: null,
//     });

//     return res.status(200).json({ message: "Password reset successful" });
//   } catch (err) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }

// };

exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const user = await MasterAdmin.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 12);

    await MasterAdmin.update(
      {
        password: hashedPassword,
        resetOTP: null,
        resetOTPExpiry: null,
      },
      { where: { id: user.id } }
    );

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }

};

// exports.getCabDetails = async (req, res) => {
//   try {
//     const adminId = req.query.admin;// Get logged-in admin's

//     // Fetch only drivers assigned to this admin
//     const drivers = await Driver.find({ addedBy: adminId });
//     const cabs = await CabDetails.find({ addedBy: adminId });
//     const assignedCabs = await CabAssigned.find({ assignedBy: adminId });

//     res.status(200).json({

//       totalDrivers: drivers.length,

//       totalCabs: cabs.length,

//       totalCabAssigned: assignedCabs.length
//     });
//   } catch (error) {

exports.getCabDetails = async (req, res) => {
  try {
    const adminId = req.query.admin; // Logged-in admin ID
    console.log("adminId", adminId)

    const cacheKey = `cabDetails:${adminId || 'unknown'}`;
    const bypass = req.headers['cache-control'] === 'no-cache';
    if (!bypass) {
      const cached = mcCGet(cacheKey);
      if (cached) {
        if (cached.headers) {
          if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
          if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
          if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
        }
        if (req.headers['if-none-match'] && cached.headers?.ETag && req.headers['if-none-match'] === cached.headers.ETag) {
          return res.status(304).end();
        }
        if (req.headers['if-modified-since'] && cached.headers?.['Last-Modified']) {
          const ifMs = new Date(req.headers['if-modified-since']);
          const lastMs = new Date(cached.headers['Last-Modified']);
          if (!isNaN(ifMs) && lastMs <= ifMs) {
            return res.status(304).end();
          }
        }
        return res.status(200).json(cached.body);
      }
    }

    // 1. Fetch Drivers for this Admin
    const drivers = await Driver.findAll({
      where: { addedBy: adminId },
    });

    // 2. Fetch Cabs for this Admin
    const cabs = await CabsDetails.findAll({
      where: { addedBy: adminId },
    });

    // 3. Fetch Assigned Cabs for this Admin
    const assignedCabs = await CabAssignment.findAll({
      where: { assignedBy: adminId },
    });

    // 4. Return counts
    // caching headers
    const crypto = require('crypto');
    const lastMod = new Date();
    const lastModUTC = lastMod.toUTCString();
    const etagBase = `${adminId || 'unknown'}|${drivers.length}|${cabs.length}|${assignedCabs.length}`;
    const etag = crypto.createHash('md5').update(etagBase).digest('hex');
    const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
    res.set('Cache-Control', cacheControl);
    res.set('Last-Modified', lastModUTC);
    res.set('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const ifMs = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
    if (ifMs && lastMod <= ifMs) {
      return res.status(304).end();
    }

    const payload = {
      totalDrivers: drivers.length,
      totalCabs: cabs.length,
      totalCabAssigned: assignedCabs.length,
    };
    mcCSet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
    res.status(200).json(payload);
  } catch (error) {
    console.error("Error in getCabDetails:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};