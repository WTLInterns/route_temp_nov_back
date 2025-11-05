const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Import JWT
const { Admin } = require("../models");


// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};
// Function to generate a random password
const generateRandomPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
// Function to send email and create sub-admin
const sendSubAdminEmail = async (req, res) => {
  try {
    const { email, name, role, phone } = req.body;

    // Validate required fields
    if (!email || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and phone are required",
      });
    }

    // Generate a random password for the new sub-admin
    const password = generateRandomPassword();

    // Hash the password before saving to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new sub-admin in the database
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: role || "sub-admin", // Default to "sub-admin" if role not provided
      phone,
    });

    // Save the sub-admin to the database
    await newAdmin.save();

    // Create a transporter for sending the email
    const transporter = createTransporter();

    // Define the email options
    const mailOptions = {
      from: `"Admin Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Sub-Admin Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 8px; width: 600px; margin: 0 auto;">
          <!-- Header with Company Logo and Name -->
          <div style="text-align: center;">
            <img src="https://media.licdn.com/dms/image/v2/D4D03AQGliPQEWM90Ag/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1732192083386?e=2147483647&v=beta&t=jZaZ72VS6diSvadKUEgQAOCd_0OKpVbeP44sEOrh-Og" 
                 alt="Route BudgetLogo" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 10px;">
            <h1 style="color: #2c3e50; font-size: 24px; font-weight: bold;">Route BudgetPvt Ltd</h1>
          </div>
          
          <!-- Body Content -->
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #2c3e50; font-size: 22px; text-align: center;">Welcome, ${name}!</h2>
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              We're excited to have you as a sub-admin in the Route Budgetteam. Below are your login details:
            </p>
            
            <!-- User Details -->
            <div style="background-color: #f9fafb; padding: 10px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            
            <!-- Instructions -->
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              Please log in using the credentials provided above. After logging in, we recommend you change your password for security reasons.
            </p>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px;">
              <p style="color: #7f8c8d; font-size: 14px;">If you have any questions, feel free to contact our support team.</p>
            </div>
          </div>
        </div>
      `,
    };

    // Send the email with credentials
    const info = await transporter.sendMail(mailOptions);

    // Respond with success message
    return res.json({
      success: true,
      message: "Sub-admin created and email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating sub-admin or sending email",
      error: error.message,
    });
  }
};




const loginSubAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    if (admin.status === "inactive") return res.status(403).json({ success: false, message: "Account inactive" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Subscription info
    let subscription = null;
    if (admin.subscriptionType) {
      const today = new Date();
      const endDate = admin.subscriptionEnd ? new Date(admin.subscriptionEnd) : null;
      const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))) : 0;

      subscription = {
        type: admin.subscriptionType,
        startDate: admin.subscriptionStart,
        endDate: admin.subscriptionEnd,
        cabLimit: admin.subscriptionCabLimit,
        daysLeft,
      };
    }

    return res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        status: admin.status,
      },
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ------------------- Free Trial -------------------
const startFreeTrial = async (req, res) => {
  try {
    const subadminId = req.admin.id;
    const admin = await Admin.findByPk(subadminId);

    if (!admin) return res.status(404).json({ success: false, message: "Subadmin not found" });

    const today = new Date();

    if (admin.subscriptionType === "trial" && new Date(admin.subscriptionEnd) > today) {
      return res.status(400).json({ success: false, message: "Trial already active" });
    }

    const startDate = today;
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    admin.subscriptionType = "trial";
    admin.subscriptionStart = startDate;
    admin.subscriptionEnd = endDate;
    admin.subscriptionPrice = 0;
    admin.subscriptionCabLimit = 50;
    await admin.save();

    return res.json({
      success: true,
      message: "7-day Free Trial started",
      subscription: {
        type: "trial",
        startDate,
        endDate,
        daysLeft: 7,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const buyPaidSubscription = async (req, res) => {
  try {
    const subadminId = req.admin.id;
    let { price } = req.body;
    price = Number(price);

    const admin = await Admin.findByPk(subadminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Subadmin not found" });
    }

    const startDate = new Date();
    const endDate = new Date();
    let durationDays, cabLimit, plan;

    if (price === 14999) { 
      durationDays = 365;    // yearly
      cabLimit = 50;
      plan = "Yearly";
    } else {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    endDate.setDate(startDate.getDate() + durationDays);

    admin.subscriptionType = "paid";
    admin.subscriptionStart = startDate;
    admin.subscriptionEnd = endDate;
    admin.subscriptionPrice = price;
    admin.subscriptionCabLimit = cabLimit;
    await admin.save();

    return res.json({
      success: true,
      message: `Paid subscription activated for ₹${price}`,
      subscription: {
        type: "paid",
        plan,
        startDate,
        endDate,
        daysLeft: durationDays,
        price,
      },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




const getSubscriptionStatus = async (req, res) => {
  try {
    const subadminId = req.admin.id;
    const admin = await Admin.findByPk(subadminId);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Subadmin not found" });
    }

    let status = "inactive"; // default
    const now = new Date();

    if (admin.subscriptionType === "trial") {
      if (admin.subscriptionEnd && now > admin.subscriptionEnd) {
        status = "expired"; // Trial exists but expired
      } else {
        status = "active"; // Trial running
      }
    } else if (admin.subscriptionType === "paid") {
      if (admin.subscriptionEnd && now > admin.subscriptionEnd) {
        status = "expired"; // Paid expired
      } else {
        status = "active"; // Paid active
      }
    } else {
      status = "none"; // Never had trial/paid
    }

    return res.json({
      success: true,
      subscription: {
        type: admin.subscriptionType || "none",
        startDate: admin.subscriptionStart,
        endDate: admin.subscriptionEnd,
        price: admin.subscriptionPrice,
        status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const getPaidSubAdmins = async (req, res) => {
  try {
    const today = new Date();

    const subAdmins = await Admin.findAll({
      attributes: { exclude: ["password"] },
      where: { subscriptionType: "paid" }, // ✅ only paid subscriptions
      order: [["createdAt", "DESC"]],
    });

    const updatedSubAdmins = subAdmins.map((subAdmin) => {
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
          status,
          price: subAdmin.subscriptionPrice,
        };
      }

      return {
        ...subAdmin.toJSON(),
        subscription,
      };
    });

    res.status(200).json({ success: true, subAdmins: updatedSubAdmins });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admins",
      error: error.message,
    });
  }
};

const getFreeTrialSubAdmins = async (req, res) => {
  try {
    const today = new Date();

    const subAdmins = await Admin.findAll({
      attributes: { exclude: ["password"] },
      where: { subscriptionType: "trial" }, // ✅ only trial subscriptions
      order: [["createdAt", "DESC"]],
    });

    const updatedSubAdmins = subAdmins.map((subAdmin) => {
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
          type: subAdmin.subscriptionType, // "trial"
          startDate: subAdmin.subscriptionStart,
          endDate: subAdmin.subscriptionEnd,
          daysLeft,
          status,
          price: subAdmin.subscriptionPrice, // usually 0 for trials
        };
      }

      return {
        ...subAdmin.toJSON(),
        subscription,
      };
    });

    res.status(200).json({ success: true, subAdmins: updatedSubAdmins });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch free trial sub-admins",
      error: error.message,
    });
  }
};


module.exports = { sendSubAdminEmail, loginSubAdmin, startFreeTrial, buyPaidSubscription, getSubscriptionStatus, getFreeTrialSubAdmins, getPaidSubAdmins };

