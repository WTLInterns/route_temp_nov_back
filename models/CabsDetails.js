
// const mongoose = require("mongoose");
// const { image } = require("../config/cloudinary");

// const CabSchema = new mongoose.Schema(
//     {
//         cabNumber: {
//             type: String,
//             unique: true,
//         },
//         insuranceNumber: {
//             type: String,
//         },
//         insuranceExpiry: {
//             type: Date,
//         },
//         registrationNumber: {
//             type: String,
//         },
//         cabImage: {
//             type: String, // Storing Cloudinary image URL
//         },
//         location: {
//             from: { type: String, required: false }, // ✅ Made optional
//             to: { type: String, required: false },   // ✅ Made optional
//             totalDistance: { type: Number, required: false },
//         },
//         fuel: {
//             type: {
//                 type: String,
//                 enum: ["Cash", "Card"], 
//             },
//             receiptImage: { type: [String] }, 
//             transactionImage: { type: [String] }, 
//             amount: { type: [Number], required: false }, // ✅ Made optional
//         },
//         fastTag: {
//             paymentMode: {
//                 type: String,
//                 enum: ["Online Deduction", "Cash", "Card"], 
//             },
//             amount: { type: [Number] },
//             cardDetails: { type: String },
//         },
//         tyrePuncture: {
//             image: { type: [String] }, 
//             repairAmount: { type: [Number] },
//         },
  
//         vehicleServicing: {
//             requiredService: { type: Boolean, default: false }, 
//             details: { type: String },                            
//             image: { type: [String] }, 
//             receiptImage: { type: [String] },  
//             amount: { type: [Number] },          
//             meter: { type: [Number] },               
//             kmTravelled: {type: Number},
//             totalKm: {type: Number},   
              
//           },
//         otherProblems: {
//             image: { type: [String] },
//             details: { type: String }, 
//             amount: { type: [Number] },
//         },
//         Driver: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Driver",
//         },
//         addedBy: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Admin",
//         },

//         cabDate: {
//             type: Date,
//             default: Date.now,
//         },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("CabDetails", CabSchema);


const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CabsDetails = sequelize.define(
    "CabsDetails",
    {
      // Basic Info
      cabNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
        imei: {
        type: DataTypes.STRING,
        // allowNull: false,
        unique: true, // Ensures no duplicate devices
      },
      insuranceNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      
      insuranceExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      registrationNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cabImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Location
      location_from: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location_to: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location_totalDistance: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      // Fuel
      fuel_type: {
        type: DataTypes.ENUM("Cash", "Card"),
        allowNull: true,
      },
      fuel_receiptImage: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      fuel_transactionImage: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      fuel_amount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },

      // FastTag
      fastTag_paymentMode: {
        type: DataTypes.ENUM("Online Deduction", "Cash", "Card"),
        allowNull: true,
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
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      tyrePuncture_repairAmount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },

      // Vehicle Servicing
      servicing_requiredService: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      servicing_details: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      servicing_image: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      servicing_receiptImage: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      servicing_amount: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },
      servicing_meter: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: true,
      },
      servicing_kmTravelled: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      servicing_totalKm: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      // Other Problems
      otherProblems_image: {
        type: DataTypes.ARRAY(DataTypes.STRING),
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

      // Foreign Keys
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "drivers", // correct table name (lowercase plural)
          key: "id",
        },
      },
      addedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "admins", // keep capitalized if Admin model uses `Admins`
          key: "id",
        },
      },

      // Date
      cabDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: true,
      tableName: "CabDetails", // ✅ Correct table name
    }
  );

  return CabsDetails;
};
