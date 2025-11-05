
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const { Resend } = require("resend"); // ✅ Correct import
const { Admin } = require("../models");
require("dotenv").config();
const { Op } = require("sequelize");

const resend = new Resend(process.env.RESEND_API_KEY); // ✅ Instance

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email
// const sendOTP = async (req, res) => {
//   const { email } = req.body;
//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const otp = generateOTP();

//     // Set OTP expiry to 10 minutes from now
//     const otpExpiry = new Date();
//     otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

//     // Save OTP and expiry
//     await User.findByIdAndUpdate(user._id, {
//       resetOTP: otp,
//       resetOTPExpiry: otpExpiry,
//     });

//     // Send OTP email
//     await resend.emails.send({
//       from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
//       to: email,
//       subject: "Password Reset OTP",
//       html: `
//         <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">

//           <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
//           <p style="color: #555; font-size: 16px; line-height: 1.6;">
//             You recently requested to reset your password for your account. Use the following One-Time Password (OTP) to complete your request:
//           </p>
//           <div style="background-color: #f0f4f8; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #1e90ff; letter-spacing: 10px; border-radius: 8px; margin: 20px 0;">
//             ${otp}
//           </div>
//           <p style="color: #555; font-size: 16px;">
//             <strong >Note:</strong> This OTP will expire in <strong>2 minutes</strong>.
//           </p>
//           <p style="color: #999; font-size: 14px; margin-top: 30px;">
//             If you didn’t request this, please ignore this email. For further assistance, feel free to reach out to our support team.
//           </p>
//           <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
//           <p style="color: #aaa; font-size: 12px; text-align: center;">
//             © 2025 Route BudgetPvt. Ltd. All rights reserved.<br />
//             <a href="<contact@worldtriplink.com>" style="color: #1e90ff; text-decoration: none;">www.worldtriplink.com</a>
//           </p>
//         </div>
//       `,
//     });


//     return res.status(200).json({ message: "OTP sent successfully to your email" });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const sendOTP = async (req, res) => {
  const { email } = req.body;
  console.log("email--", req.body.email)
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    // 🔍 Find user (case-insensitive)
    const user = await Admin.findOne({
      where: {
        email: {
          [Op.iLike]: email.trim()
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Generate OTP and expiry
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    //  Update user's OTP fields
    await Admin.update(
      { resetOTP: otp, resetOTPExpiry: otpExpiry },
      { where: { id: user.id } }
    );

    // Send OTP email
    await resend.emails.send({
      from: `"Route BudgetPvt. Ltd." <contact@worldtriplink.com>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
         
          <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You recently requested to reset your password for your account. Use the following One-Time Password (OTP) to complete your request:
          </p>
          <div style="background-color: #f0f4f8; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #1e90ff; letter-spacing: 10px; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #555; font-size: 16px;">
            <strong >Note:</strong> This OTP will expire in <strong>10 minutes</strong>.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you didn’t request this, please ignore this email. For further assistance, feel free to reach out to our support team.
          </p>
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            © 2025 Route BudgetPvt. Ltd. All rights reserved.<br />
            <a href="mailto:contact@worldtriplink.com" style="color: #1e90ff; text-decoration: none;">www.worldtriplink.com</a>
          </p>
        </div>
      `,
    });

    return res.status(200).json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Verify OTP
// const verifyOTP = async (req, res) => {
//   const { email, otp } = req.body

//   if (!email || !otp) {
//     return res.status(400).json({ message: "Email and OTP are required" })
//   }

//   try {
//     const user = await User.findOne({ email })
//     if (!user) {
//       return res.status(404).json({ message: "User not found" })
//     }

//     // Check if OTP matches and is not expired
//     if (user.resetOTP !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" })
//     }

//     if (new Date() > new Date(user.resetOTPExpiry)) {
//       return res.status(400).json({ message: "OTP has expired. Please request a new one." })
//     }

//     // OTP is valid, allow user to reset password
//     return res.status(200).json({ message: "OTP verified successfully" })
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" })
//   }
// }

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    // 🔍 Find user by email (case-insensitive)
    const user = await Admin.findOne({
      where: {
        email: {
          [Op.iLike]: email.trim()
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Check OTP match
    if (user.resetOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ⌛ Check expiry
    const now = new Date();
    if (now > new Date(user.resetOTPExpiry)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // ✅ OTP verified
    return res.status(200).json({ message: "OTP verified successfully" });

  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



// Reset Password
// const resetPassword = async (req, res) => {
//   const { email, password } = req.body

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required" })
//   }

//   try {
//     const user = await User.findOne({ email })
//     if (!user) {
//       return res.status(404).json({ message: "User not found" })
//     }

//     // Hash the new password
//     const hashedPassword = await bcrypt.hash(password, 12)

//     // Update password and clear OTP fields
//     await User.findByIdAndUpdate(
//       user._id,
//       {
//         password: hashedPassword,
//         resetOTP: null,
//         resetOTPExpiry: null,
//       },
//       { new: true },
//     )

//     return res.status(200).json({ message: "Password reset successful" })
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" })
//   }
// }

const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 🔍 Find user by email (case-insensitive)
    const user = await Admin.findOne({
      where: {
        email: {
          [Op.iLike]: email.trim()
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 💾 Update user password and clear OTP
    await Admin.update(
      {
        password: hashedPassword,
        resetOTP: null,
        resetOTPExpiry: null
      },
      {
        where: { id: user.id }
      }
    );

    return res.status(200).json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Password Reset Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { sendOTP, verifyOTP, resetPassword }