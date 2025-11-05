// const mongoose = require("mongoose");

// const CabSchema = new mongoose.Schema({
//     cabNumber: {
//        type:mongoose.Schema.Types.ObjectId,
//        ref:'CabDetails'
//     },

//     location: {
//         from: { type: String, required: true }, // Starting location
//         to: { type: String, required: true }, // Destination location
//         dateTime: { type: Date, default: Date.now }, // Auto-captured date & time
//         totalDistance: { type: Number, required: false }, // Total calculated distance
//     },
//     fuel: {
//         type: {
//             type: String,
//             enum: ["Cash", "Card"], // Payment types
//             required: true,
//         },
//         receiptImage: { type: String }, // Image URL or file path
//         transactionImage: { type: String }, // Image URL or file path (for Card)
//         amount: { type: [Number], required: true },
//     },
//     fastTag: {
//         paymentMode: {
//             type: String,
//             enum: ["Online Deduction", "Cash", "Card"], // FastTag payment modes
//             required: true,
//         },
//         amount: { type: [Number] },
//         cardDetails: { type: String },
//     },
//     tyrePuncture: {
//         image: { type: String }, // Image of puncture
//         repairAmount: { type: [Number] },
//     },

//     vehicleServicing: {
//         requiredService: { type: Boolean, default: false }, // Whether servicing is required
//         details: { type: String }, // Details based on distance
//         image: { type: String }, // Image path or URL
//     },


//     otherProblems: {
//         image: { type: String }, // Image of other problems
//         details: { type: String }, // Details of other problems
//         amount: { type: [Number] }, // Amount spent on other problems
//     },

//     Driver: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Driver"
//     }, // Reference to Driver Model
//     addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
// }, { timestamps: true });

// const Cab = mongoose.model("Cab", CabSchema);

// module.exports = Cab;



const { DataTypes } = require("sequelize"); // ✅ Fixed import

module.exports = (sequelize) => {
  const Cab = sequelize.define(
    "Cab",
    {
      cabNumberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "CabDetails",
          key: "id",
        },
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "drivers",
          key: "id",
        },
      },
      addedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "admins",
          key: "id",
        },
      },

      // Location Info
      location_from: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      location_to: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dateTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      totalDistance: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      // Fuel Info
      fuel_type: {
        type: DataTypes.ENUM("Cash", "Card"),
        allowNull: false,
      },
      fuel_receiptImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fuel_transactionImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fuel_amount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: false,
      },

      // FastTag
      fastTag_paymentMode: {
        type: DataTypes.ENUM("Online Deduction", "Cash", "Card"),
        allowNull: false,
      },
      fastTag_amount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },
      fastTag_cardDetails: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Tyre Puncture
      tyrePuncture_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tyrePuncture_repairAmount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },

      // Vehicle Servicing
      vehicleServicing_requiredService: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      vehicleServicing_details: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vehicleServicing_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Other Problems
      otherProblems_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      otherProblems_details: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      otherProblems_amount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "cabs",
    }
  );

  // ✅ Associations
  Cab.associate = (models) => {
    Cab.belongsTo(models.CabDetails, {
      foreignKey: "cabNumberId",
      as: "CabDetails",
    });

    Cab.belongsTo(models.Driver, {
      foreignKey: "driverId",
      as: "driver",
    });

    Cab.belongsTo(models.Admin, {
      foreignKey: "addedBy",
      as: "addedByAdmin",
    });
  };

  return Cab;
};

