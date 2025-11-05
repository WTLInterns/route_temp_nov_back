// // // models/ServicingAssignment.js
// // const mongoose = require("mongoose");

// // const servicingAssignmentSchema = new mongoose.Schema({
// //   cab: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "CabDetails",
// //     required: true,
// //   },
// //   driver: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "Driver",
// //     required: true,
// //   },
// //   assignedBy: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "Admin",
// //     required: true,
// //   },
// //   serviceDate: {
// //     type: Date,
// //     default: Date.now, 
// //   },
// //   status: {
// //     type: String,
// //     enum: ["pending", "completed"],
// //     default: "pending",
// //   },
// //   receiptImage: {
// //     type: String,
// //   },
// //   servicingAmount: {
// //     type: Number,
// //   },
// //   notes: {
// //     type: String,
// //   }
// // }, { timestamps: true });

// // module.exports = mongoose.model("ServicingAssignment", servicingAssignmentSchema);




// models/ServicingAssignment.js(it is mine code)
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const ServicingAssignment = sequelize.define("ServicingAssignment", {
//     // id: {
//     //   type: DataTypes.UUID,
//     //   defaultValue: DataTypes.UUIDV4,
//     //   primaryKey: true,
//     // },
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },
//     serviceDate: {
//       type: DataTypes.DATE,
//       defaultValue: DataTypes.NOW,
//     },
//     status: {
//       type: DataTypes.ENUM("pending", "completed"),
//       defaultValue: "pending",
//     },
//     receiptImage: {
//       type: DataTypes.STRING,
//     },
//     servicingAmount: {
//       type: DataTypes.FLOAT,
//     },
//     notes: {
//       type: DataTypes.STRING,
//     },
//   }, {
//     tableName: "ServicingAssignment",
//     timestamps: true,
//   });

//   ServicingAssignment.associate = (models) => {
//     ServicingAssignment.belongsTo(models.CabsDetails, {
//       foreignKey: {
//         name: "cabNumber",   //cabId
//         allowNull: false,
//       },
//       as: "CabDetails",
//     });

//     ServicingAssignment.belongsTo(models.Driver, {
//       foreignKey: {
//         name: "driverId",
//         allowNull: false,
//       },
//       as: "drivers",
//     });

//     ServicingAssignment.belongsTo(models.Admin, {
//       foreignKey: {
//         name: "assignedBy",
//         allowNull: false,
//       },
//       as: "assignedByAdmin",
//     });
//   };

//   return ServicingAssignment;
// };



/**team code */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ServicingAssignment = sequelize.define("ServicingAssignment", {
    // id: {
    //   type: DataTypes.UUID,
    //   defaultValue: DataTypes.UUIDV4,
    //   primaryKey: true,
    // },
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    serviceDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed"),
      defaultValue: "pending",
    },
    receiptImage: {
      type: DataTypes.STRING,
    },
    servicingAmount: {
      type: DataTypes.FLOAT,
    },
    notes: {
      type: DataTypes.STRING,
    },
  }, {
    tableName: "ServicingAssignment",
    timestamps: true,
  });

  ServicingAssignment.associate = (models) => {
    ServicingAssignment.belongsTo(models.CabsDetails, {
      foreignKey: {
        name: "cabNumber",   //cabId
        allowNull: false,
      },
      as: "CabDetails",
    });

    ServicingAssignment.belongsTo(models.Driver, {
      foreignKey: {
        name: "driverId",
        allowNull: false,
      },
      as: "drivers",
    });

    ServicingAssignment.belongsTo(models.Admin, {
      foreignKey: {
        name: "assignedBy",
        allowNull: false,
      },
      as: "assignedByAdmin",
    });
  };

  return ServicingAssignment;
};