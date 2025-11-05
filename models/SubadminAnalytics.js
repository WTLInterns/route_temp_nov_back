// const mongoose = require("mongoose");

// const analyticsSchema = new mongoose.Schema({
//   date: { type: Date, default: Date.now },
//   totalRides: Number,
//   revenue: Number,
//   customerSatisfaction: Number,
//   fleetUtilization: Number,
// });

// module.exports = mongoose.model("Analytics", analyticsSchema);


// models/analytics.js(it is mine code)


// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Analytics = sequelize.define('SubdminAnalytics', {
//     date: {
//       type: DataTypes.DATE,
//       defaultValue: DataTypes.NOW,
//     },
//     totalRides: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },
//     revenue: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },
//     customerSatisfaction: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },
//     fleetUtilization: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },
//   }, {
//     tableName: 'analytics',
//     timestamps: false, // set to true if you want createdAt/updatedAt fields
//   });

//   return Analytics;
// };



/**team code */

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Analytics = sequelize.define('SubdminAnalytics', {
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    totalRides: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    revenue: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    customerSatisfaction: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    fleetUtilization: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  }, {
    tableName: 'analytics',
    timestamps: false, // set to true if you want createdAt/updatedAt fields
  });

  return Analytics;
};