// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Notification = sequelize.define(
//     "Notification",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       recipientId: {
//         type: DataTypes.INTEGER, // FK to Admin (sub-admin ID)
//         allowNull: false,
//       },
//       recipientType: {
//         type: DataTypes.ENUM("trial", "paid"),
//         allowNull: false,
//       },
//       message: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//       },
//       sentAt: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//       },
//     },
//     {
//       tableName: "Notifications", // ✅ force table name
//       timestamps: true,          // ✅ keeps createdAt & updatedAt
//     }
//   );

//   Notification.associate = (models) => {
//     Notification.belongsTo(models.Admin, {
//       foreignKey: "recipientId",
//       as: "recipient",
//     });
//   };

//   return Notification;
// };


const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      recipientType: {
        type: DataTypes.ENUM("trial", "paid"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Notifications",
      timestamps: true,
    }
  );

  // Associations
  Notification.associate = (models) => {
    // Each notification belongs to a particular subadmin/admin
    Notification.belongsTo(models.Admin, {
      foreignKey: "recipientId",
      as: "recipient",
      onDelete: "CASCADE", // ✅ ensures deleting subadmin deletes notifications
      hooks: true,         // ✅ required for Sequelize to enforce CASCADE
    });
  };

  return Notification;
};
