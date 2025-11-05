// const { DataTypes } = require("sequelize");

// // models/JobPostMarket.js
// module.exports = (sequelize, DataTypes) => {
//   const JobPostMarket = sequelize.define(
//     "JobPostMarket",
//     {
//       name: { type: DataTypes.STRING, allowNull: false },
//       phone: { type: DataTypes.STRING, allowNull: false },
//       tripType: {
//         type: DataTypes.ENUM("one-way", "round-trip"),
//         allowNull: false,
//       },
//       vehicleType: { type: DataTypes.STRING, allowNull: false },
//       pickupDate: { type: DataTypes.DATEONLY, allowNull: false },
//       pickupTime: { type: DataTypes.TIME, allowNull: false },
//       pickupLocation: { type: DataTypes.STRING, allowNull: false },
//       dropoffLocation: { type: DataTypes.STRING, allowNull: false },
//       addedBy: {
//         type: DataTypes.INTEGER, // FK to admin
//         allowNull: false,
//       },
//     },
//     {
//       tableName: "JobPostMarket", // 👈 Exact table name
//       freezeTableName: true,      // Prevent pluralization
//     }
//   );

//   return JobPostMarket;
// };

// models/JobPostMarket.js
// module.exports = (sequelize, DataTypes) => {
//   const JobPostMarket = sequelize.define(
//     "JobPostMarket",
//     {
//       // your fields here
//       name: { type: DataTypes.STRING, allowNull: false },
//       phone: { type: DataTypes.STRING, allowNull: false },
//       tripType: {
//         type: DataTypes.ENUM("one-way", "round-trip"),
//         allowNull: false,
//       },
//       vehicleType: { type: DataTypes.STRING, allowNull: false },
//       pickupDate: { type: DataTypes.DATEONLY, allowNull: false },
//       pickupTime: { type: DataTypes.TIME, allowNull: false },
//       pickupLocation: { type: DataTypes.STRING, allowNull: false },
//       dropoffLocation: { type: DataTypes.STRING, allowNull: false },
//       status: {
//         type: DataTypes.ENUM('available', 'accepted', 'completed', 'cancelled'),
//         defaultValue: 'available',
//         allowNull: false,
//       },
//       addedBy: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//       },
//        acceptedBy: {
//     type: DataTypes.INTEGER, // should match the type of addedBy
//     allowNull: true
//   },
      
//     },
    
//     {
//       tableName: "JobPostMarket",
//       freezeTableName: true,
//       timestamps: true,
//     }
//   );

//   return JobPostMarket;

  
// };

// models/JobPostMarket.js
module.exports = (sequelize, DataTypes) => {
  const JobPostMarket = sequelize.define(
    "JobPostMarket",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false },

      tripType: {
        type: DataTypes.ENUM("one-way", "round-trip", "rental"),
        allowNull: false,
      },

      vehicleType: { type: DataTypes.STRING, allowNull: false },

      // Common fields
      pickupDate: { type: DataTypes.DATEONLY, allowNull: true },
      pickupTime: { type: DataTypes.TIME, allowNull: true },
      pickupLocation: { type: DataTypes.STRING, allowNull: true },
      dropoffLocation: { type: DataTypes.STRING, allowNull: true },
      distance: { type: DataTypes.FLOAT, allowNull: true },

      // Round Trip specific
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      startTime: { type: DataTypes.TIME, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      endTime: { type: DataTypes.TIME, allowNull: true },
      noOfDays: { type: DataTypes.INTEGER, allowNull: true },

      // Rental Trip specific
      rentalHours: { type: DataTypes.INTEGER, allowNull: true },
      fixedKM: { type: DataTypes.INTEGER, allowNull: true },
      extraHours: { type: DataTypes.INTEGER, allowNull: true },
      extraDistance: { type: DataTypes.INTEGER, allowNull: true },

      // Status
      status: {
        type: DataTypes.ENUM("available", "accepted", "completed", "cancelled"),
        defaultValue: "available",
        allowNull: false,
      },

      addedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      acceptedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "JobPostMarket",
      freezeTableName: true,
      timestamps: true,
    }
  );

  // 🔗 Associations
  JobPostMarket.associate = (models) => {
    JobPostMarket.belongsTo(models.Admin, {
      foreignKey: "acceptedBy",
      as: "acceptedAdmin",
    });
  };

  return JobPostMarket;
};
