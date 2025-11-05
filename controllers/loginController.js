
// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// // const mongoose = require("mongoose");
// const { Resend } = require("resend");
// const Driver = require("../models/loginModel");
// require("dotenv").config();

// const router = express.Router();
// const resend = new Resend(process.env.RESEND_API_KEY);


// const registerUser = async (req, res) => {
//   try { 
//     const { name, email, phone, licenseNo, adharNo, addedBy } = req.body;
//     const profileImage = req.files?.profileImage?.[0]?.path || "";
//     const licenseNoImage = req.files?.licenseNoImage?.[0]?.path || "";
//     const adharNoImage = req.files?.adharNoImage?.[0]?.path || "";

//     if (!name?.trim() || !email?.trim() || !phone?.trim() || !licenseNo?.trim() || !adharNo?.trim()) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     if (!/^\d{12}$/.test(adharNo)) {
//       return res.status(400).json({ error: "Invalid Aadhaar number" });
//     }

//     if (!/^\d{10}$/.test(phone)) {
//       return res.status(400).json({ error: "Invalid phone number" });
//     }

//     // ✅ Check if driver already exists
//     const existingDriver = await Driver.findOne({ where : {email} });
//     if (existingDriver) {
//       return res.status(400).json({ error: "Driver with this email already exists" });
//     }

//     // ✅ Use phone number as password
//     const password = phone;

//     // ✅ Create driver
//     const newDriver = await Driver.create({
//       name,
//       email,
//       password,
//       phone,
//       licenseNo,
//       adharNo,
//       profileImage,
//       licenseNoImage,
//       adharNoImage,
//       addedBy,
//     });


//     res.status(201).json({
//       message: "Driver registered successfully",
//       user: {
//         _id: newDriver._id,
//         name: newDriver.name,
//         email: newDriver.email,
//         phone: newDriver.phone,
//         licenseNo: newDriver.licenseNo,
//         adharNo: newDriver.adharNo,
//         profileImage: newDriver.profileImage,
//         licenseNoImage: newDriver.licenseNoImage,
//         adharNoImage: newDriver.adharNoImage,
//         addedBy: newDriver.addedBy,
//         createdAt: newDriver.createdAt,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error registering driver", error: err.message });
//   }
// };


// const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     // ✅ Find user and explicitly select password
//     const user = await Driver.findOne({ email }).select("+password");
//     if (!user) {
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//     // ✅ Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//     // ✅ Generate JWT Token
//     const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
//       expiresIn: "10d",
//     });

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         licenseNo: user.licenseNo,
//         adharNo: user.adharNo,
//         profileImage: user.profileImage,
//         addedBy: user.addedBy,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error logging in", error: err.message });
//   }
// };

// // ✅ Export functions
// module.exports = { registerUser, loginUser };





const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
require("dotenv").config();
const { Driver, Admin } = require("../models");

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Register Driver
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, licenseNo, adharNo, addedBy } = req.body;

    const profileImage = req.files?.profileImage?.[0]?.path || "";
    const licenseNoImage = req.files?.licenseNoImage?.[0]?.path || "";
    const adharNoImage = req.files?.adharNoImage?.[0]?.path || "";

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // if (!/^\d{12}$/.test(adharNo)) {
    //   return res.status(400).json({ error: "Invalid Aadhaar number" });
    // }

    // if (!/^\d{10}$/.test(phone)) {
    //   return res.status(400).json({ error: "Invalid phone number" });
    // }

    const existingDriver = await Driver.findOne({ where: { email } });
    if (existingDriver) {
      return res.status(400).json({ error: "Driver with this email already exists" });
    }

    // ✅ Use phone number as password, then hash it
    const plainPassword = phone;
    // const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // ✅ Create new driver
    const newDriver = await Driver.create({
      name,
      email,
      password: phone,
      phone,
      licenseNo,
      adharNo,
      profileImage,
      licenseNoImage,
      adharNoImage,
      // addedBy:req.admin.id,
      addedBy
    });

    res.status(201).json({
      message: "Driver registered successfully",
      user: {
        id: newDriver.id,
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        licenseNo: newDriver.licenseNo,
        adharNo: newDriver.adharNo,
        profileImage: newDriver.profileImage,
        licenseNoImage: newDriver.licenseNoImage,
        adharNoImage: newDriver.adharNoImage,
        addedBy: newDriver.addedBy,
        createdAt: newDriver.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error registering driver", error: err.message });
  }
};

// ✅ Login Driver
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt with email:", email, password)
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await Driver.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // ✅ Generate driver token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "10d",
    });

    // ✅ Fetch subadmin information
    let subAdminData = null;
    
    if (user.addedBy) {
      const subAdmin = await Admin.findByPk(user.addedBy);
      if (subAdmin) {
        subAdminData = {
          id: subAdmin.id,
          name: subAdmin.name,
          email: subAdmin.email,
          phone: subAdmin.phone,
          companyLogo: subAdmin.companyLogo,
          companyInfo: subAdmin.companyInfo,
          role: subAdmin.role,
          status: subAdmin.status,
        };
      }
    }

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        licenseNo: user.licenseNo,
        adharNo: user.adharNo,
        profileImage: user.profileImage,
        addedBy: user.addedBy,
      },
      subAdmin: subAdminData,
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

module.exports = { registerUser, loginUser };
