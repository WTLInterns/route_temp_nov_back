// const mongoose = require("mongoose");

// const SubAdminSchema = new mongoose.Schema({
//   subAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // Unique ID for sub-admin
//   name: { type: String },
//   permissions: {
//     dashboard: { type: Boolean, default: false },
//     subAdmin: { type: Boolean, default: false },
//     driverManagement: { type: Boolean, default: false },
//     cabManagement: { type: Boolean, default: false },
//     rides: { type: Boolean, default: false },
//     expenseManagement: { type: Boolean, default: false },
//     analytics: { type: Boolean, default: false },
//   },
// });

// const SubAdmin = mongoose.model("SubAdminPermissions", SubAdminSchema);
// module.exports = SubAdmin;


// models/subAdminPermissions.js(It's Mine code)

// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const SubAdminPermissions = sequelize.define('SubAdminPermissions', {
//     subAdminId: {
//       type: DataTypes.INTEGER, // or UUID if your Admin IDs are UUID
//       allowNull: true,
//       references: {
//         model: 'admins', // name of the target model
//         key: 'id',
//       },
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     dashboard: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     subAdmin: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     driverManagement: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     cabManagement: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     rides: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     expenseManagement: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     analytics: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//   }, {
//     tableName: 'sub-admin-permissions',
//     timestamps: false,
//   });

//   return SubAdminPermissions;
// };



/**team code */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SubAdminPermissions = sequelize.define('SubAdminPermissions', {
    subAdminId: {
      type: DataTypes.INTEGER, // or UUID if your Admin IDs are UUID
      allowNull: true,
      references: {
        model: 'admins', // name of the target model
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dashboard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    driverManagement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cabManagement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    rides: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expenseManagement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    analytics: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'sub-admin-permissions',
    timestamps: false,
  });

  return SubAdminPermissions;
};