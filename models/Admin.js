

// const bcrypt = require("bcryptjs");
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Admin = sequelize.define(
//     "Admin",
//     {
//       profileImage: {
//         type: DataTypes.STRING,
//         allowNull: true,
//         defaultValue: "",
//       },
//       companyLogo: {
//         type: DataTypes.STRING,
//         allowNull: true,
//         defaultValue: "",
//       },
//       companyInfo: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//       },
//       signature: {
//         type: DataTypes.STRING,
//         allowNull: true,
//         defaultValue: "",
//       },
//       name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//         validate: {
//           isEmail: true,
//         },
//       },
//       password: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       role: {
//         type: DataTypes.ENUM("admin", "subadmin"),
//         allowNull: false,
//         defaultValue: "subadmin",
//       },
//       phone: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       status: {
//         type: DataTypes.STRING,
//         defaultValue: "active",
//       },
//       resetOTP: {
//         type: DataTypes.STRING,
//         allowNull: true,
//         defaultValue: null,
//       },
//       resetOTPExpiry: {
//         type: DataTypes.DATE,
//         allowNull: true,
//         defaultValue: null,
//       },

//       // ---------- Subscription ----------
//       subscriptionCabLimit: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//         defaultValue: 0,
//       },
//       subscriptionType: {
//         type: DataTypes.STRING, // "trial" | "paid"
//         allowNull: true,
//       },
//       subscriptionStart: {
//         type: DataTypes.DATE,
//         allowNull: true,
//       },
//       subscriptionEnd: {
//         type: DataTypes.DATE,
//         allowNull: true,
//       },
//       subscriptionPrice: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//       },

//       // ---------- Razorpay Payment Tracking ----------
//       razorpayOrderId: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       razorpayPaymentId: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//       razorpaySignature: {
//         type: DataTypes.STRING,
//         allowNull: true,
//       },
//     },
//     {
//       timestamps: true,
//       tableName: "admins",
//       hooks: {
//         beforeCreate: async (admin) => {
//           if (admin.password) {
//             admin.password = await bcrypt.hash(admin.password, 10);
//           }
//         },
//         beforeUpdate: async (admin) => {
//           if (admin.changed("password")) {
//             admin.password = await bcrypt.hash(admin.password, 10);
//           }
//         },
//       },
//     }
//   );

//   Admin.prototype.comparePassword = async function (candidatePassword) {
//     return bcrypt.compare(candidatePassword, this.password);
//   };

//   // Associations
//   Admin.associate = (models) => {
//     Admin.hasMany(models.Driver, {
//       foreignKey: "adminId",
//       as: "assignedDrivers",
//     });

//     Admin.hasMany(models.Cab, {
//       foreignKey: "adminId",
//       as: "assignedCabs",
//     });

//   };

//   return Admin;
// };



const bcrypt = require("bcryptjs");
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Admin = sequelize.define(
    "Admin",
    {
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      companyLogo: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      companyInfo: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      signature: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "subadmin"),
        allowNull: false,
        defaultValue: "subadmin",
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "active",
      },
      resetOTP: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      resetOTPExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },

      // ---------- Subscription ----------
      subscriptionCabLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      subscriptionType: {
        type: DataTypes.STRING, // "trial" | "paid"
        allowNull: true,
      },
      subscriptionStart: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      subscriptionEnd: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      subscriptionPrice: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      subscriptionPlan: {
        type: DataTypes.STRING, // Store the plan name
        allowNull: true,
      },

      // ---------- Razorpay Payment Tracking ----------
      razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpaySignature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "admins",
      hooks: {
        beforeCreate: async (admin) => {
          if (admin.password) {
            admin.password = await bcrypt.hash(admin.password, 10);
          }
        },
        beforeUpdate: async (admin) => {
          if (admin.changed("password")) {
            admin.password = await bcrypt.hash(admin.password, 10);
          }
        },
      },
    }
  );

  Admin.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Associations
  Admin.associate = (models) => {
    Admin.hasMany(models.Driver, {
      foreignKey: "adminId",
      as: "assignedDrivers",
    });

    Admin.hasMany(models.Cab, {
      foreignKey: "adminId",
      as: "assignedCabs",
    });

    Admin.hasMany(models.Notification, {
      foreignKey: "recipientId",
      as: "notifications",
      onDelete: "CASCADE",
      hooks: true,
    });
  };

  return Admin;
};