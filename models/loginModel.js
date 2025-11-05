
// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");

// const driverSchema = new mongoose.Schema(
//   {
//     profileImage: { type: String, default: "" },
//     licenseNoImage: { type: String, default: "" },
//     adharNoImage: { type: String, default: "" },

//     name: {
//       type: String,
//       required: [true, "Name is required"],
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       lowercase: true,
//       unique: true,
//       match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
//     },

//     password: {
//       type: String,
//       required: true,
//       minlength: [6, "Password must be at least 6 characters long"],
//       select: false, // Ensures password is not included in queries by default
//     },

//     phone: {
//       type: String,
//       required: [true, "Phone number is required"],
//       match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
//     },

//     licenseNo: {
//       type: String,
//       required: [true, "License number is required"],
//       trim: true,
//     },

//     adharNo: {
//       type: String,
//       required: [true, "Aadhaar number is required"],
//       match: [/^\d{12}$/, "Aadhaar number must be exactly 12 digits"],
//     },

//     resetOTP: { type: String, select: false },
//     otpExpiry: { type: Date, select: false },

//     verifyToken: { type: String, select: false },

//     addedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Admin",
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// // ✅ Hash password before saving (only if modified)
// driverSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// // ✅ Method to compare passwords
// driverSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // ✅ Generate OTP for password reset
// driverSchema.methods.generatePasswordResetToken = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.resetOTP = otp;
//   this.otpExpiry = Date.now() + 10 * 60 * 1000;
//   return otp;
// };

// // ✅ Generate a random password
// driverSchema.statics.generateRandomPassword = function () {
//   return crypto.randomBytes(4).toString("hex");
// };

// module.exports = mongoose.model("Driver", driverSchema);





const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class Driver extends Model {
    // Compare passwords
    async comparePassword(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    }

    // Generate OTP for password reset
    generatePasswordResetToken() {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.resetOTP = otp;
      this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now
      return otp;
    }

    // Generate random password
    static generateRandomPassword() {
      return crypto.randomBytes(4).toString('hex');
    }
  }

  Driver.init({
    profileImage: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    licenseNoImage: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    adharNoImage: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      lowercase: true,
      validate: {
        isEmail: { msg: 'Invalid email format' },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6],
          msg: 'Password must be at least 6 characters long',
        },
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: {
          args: [/^\d{10}$/],
          msg: 'Phone number must be exactly 10 digits',
        },
      },
    },
    licenseNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    adharNo: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isAadharValid(value) {
          if (value && value.toString().trim() !== '' && !/^\d{12}$/.test(value)) {
            throw new Error('Aadhaar number must be exactly 12 digits');
          }
        },
      },
    },
    resetOTP: {
      type: DataTypes.STRING,
    },
    otpExpiry: {
      type: DataTypes.DATE,
    },
    verifyToken: {
      type: DataTypes.STRING,
    },
    addedBy: {
      type: DataTypes.INTEGER, // FK to admin
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
     freezeTableName: true,
    timestamps: true,
    hooks: {
      beforeSave: async (driver) => {
        if (driver.changed('password')) {
          driver.password = await bcrypt.hash(driver.password, 10);
        }
      },
    },
  });

  return Driver;
};
