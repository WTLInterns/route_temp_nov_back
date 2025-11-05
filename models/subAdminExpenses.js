// const mongoose = require("mongoose");

// const expenseSchema = new mongoose.Schema({
//   type: { type: String, required: true },
//   amount: { type: Number, required: true },
//   date: { type: Date, default: Date.now },
//   driver: { type: String, required: true },
//   cabNumber: { type: String, required: true },
// });

// module.exports = mongoose.model("Expense", expenseSchema);

// models/Expense.js(It's Mine code)
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const SubadminExpenses = sequelize.define(
//     "SubadminExpenses",
//     {
//       id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//       },
//       type: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       amount: {
//         type: DataTypes.FLOAT,
//         allowNull: false,
//       },
//       date: {
//         type: DataTypes.DATE,
//         allowNull: false,
//         defaultValue: DataTypes.NOW,
//       },
//       driver: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       cabNumber: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//     },
//     {
//       tableName: "subadmin_expenses", // 👈 Explicit table name
//       timestamps: false,              // 👈 Disable createdAt and updatedAt
//     }
//   );

//   return SubadminExpenses;
// };



/**Team code */
const { DataTypes } = require("sequelize");


module.exports = (sequelize) => {
  const SubadminExpenses = sequelize.define(
    "SubadminExpenses",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      driver: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cabNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "subadmin_expenses", // 👈 Explicit table name
      timestamps: false,              // 👈 Disable createdAt and updatedAt
    }
  );

  return SubadminExpenses;
};