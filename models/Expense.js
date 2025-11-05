// const mongoose = require("mongoose");

// const ExpenseSchema = new mongoose.Schema(
//   {
//     adminId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Admin",
//       required: true
//     },
//     amount: { type: Number, required: true },
//     description: { type: String },
//     date: { type: Date, default: Date.now }
//   },
//   {
//     timestamps: true
//   }
// );

// module.exports = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);



/**It is mine code */

// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Expense = sequelize.define("Expense", {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true
//     },
//     adminId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//       references: {
//         model: "admins",
//         key: "id"
//       }
//     },
//     amount: {
//       type: DataTypes.FLOAT,
//       allowNull: false
//     },
//     description: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },
//     date: {
//       type: DataTypes.DATE,
//       defaultValue: DataTypes.NOW
//     }
//   }, {
//     tableName: "expenses", // ✅ recommended lowercase plural
//     timestamps: true
//   });

//   return Expense;
// };


/**team code */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Expense = sequelize.define("Expense", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "admins",
        key: "id"
      }
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "expenses", // ✅ recommended lowercase plural
    timestamps: true
  });

  return Expense;
};