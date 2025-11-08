

// // models/cabAssignment.js
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const CabAssignment = sequelize.define(
//     "CabAssignment", {
//       driverId: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         references: {
//           model: "Driver",
//           key: "id",
//         },
//       },
//       cabId: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         references: {
//           model: "CabDetails",
//           key: "id",
//         },
//       },
//       assignedAt: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//       },
//       status: {
//         type: DataTypes.ENUM("assigned", "ongoing", "completed"),
//         defaultValue: "assigned",
//       },
//       assignedBy: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         references: {
//           model: "admins",
//           key: "id",
//         },
//       },
//       cabDate: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW,
//       },

//       // Trip Details Embedded

//       locationFrom: { type: DataTypes.STRING },
//       locationTo: { type: DataTypes.STRING },
//       totalDistance: { type: DataTypes.FLOAT },

//       fuelType: { type: DataTypes.ENUM("Cash", "Card") },
//       fuelReceiptImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       fuelTransactionImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       fuelAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },

//       fastTagPaymentMode: {
//         type: DataTypes.ENUM("Online Deduction", "Cash", "Card"),
//       },
//       fastTagAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
//       fastTagCardDetails: { type: DataTypes.STRING },

//       tyreImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       tyreRepairAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },

//       servicingRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
//       servicingDetails: { type: DataTypes.TEXT },
//       servicingImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       servicingReceiptImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       servicingAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
//       servicingMeter: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
//       servicingKmTravelled: { type: DataTypes.FLOAT },
//       servicingTotalKm: { type: DataTypes.FLOAT },

//       otherImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
//       otherDetails: { type: DataTypes.TEXT },
//       otherAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
//     },
//     {
//       tableName: "CabAssignments",
//       timestamps: true,
//     }
//   );

//   return CabAssignment; 
// };




// models/cabAssignment.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CabAssignment = sequelize.define(
    "CabAssignment", {
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "drivers",
          key: "id",
        },
      },
      cabId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "CabDetails",
          key: "id",
        },
      },
      assignedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("assigned", "ongoing", "completed", "cancelled", "reassigned"),
        defaultValue: "assigned",
      },
      assignedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "admins",
          key: "id",
        },
      },
      cabDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      // Trip Details Embedded

      locationFrom: { type: DataTypes.STRING },
      locationTo: { type: DataTypes.STRING },
      totalDistance: { type: DataTypes.FLOAT },

      fuelType: { type: DataTypes.ENUM("Cash", "Card") },
      fuelReceiptImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      fuelTransactionImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      fuelAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },

      fastTagPaymentMode: {
        type: DataTypes.ENUM("Online Deduction", "Cash", "Card"),
      },
      fastTagAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
      fastTagCardDetails: { type: DataTypes.STRING },

      tyreImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      tyreRepairAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },

      servicingRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
      servicingDetails: { type: DataTypes.TEXT },
      servicingImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      servicingReceiptImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      servicingAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
      // servicingMeter: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
      servicingMeter: {type: DataTypes.ARRAY(DataTypes.FLOAT), defaultValue: []},
      servicingKmTravelled: { type: DataTypes.FLOAT },
      servicingTotalKm: { type: DataTypes.FLOAT },

      otherImage: { type: DataTypes.ARRAY(DataTypes.STRING) },
      otherDetails: { type: DataTypes.TEXT },
      otherAmount: { type: DataTypes.ARRAY(DataTypes.FLOAT) },

        // Customer Details
      customerName: {
        type: DataTypes.STRING,
      },
      customerPhone: {
        type: DataTypes.STRING,
      },

      // Locations
      pickupLocation: {
        type: DataTypes.STRING,
      },
      dropLocation: {
        type: DataTypes.STRING,
      },
      pickupLatitude: {
        type: DataTypes.FLOAT,
      },
      pickupLongitude: {
        type: DataTypes.FLOAT,
      },
      dropLatitude: {
        type: DataTypes.FLOAT,
      },
      dropLongitude: {
        type: DataTypes.FLOAT,
      },

      // Trip Type & Vehicle Type
      tripType: {
        type: DataTypes.ENUM("One Way", "Round Trip", "Hourly", "Daily"),
      },
      vehicleType: {
        type: DataTypes.ENUM("Sedan", "SUV", "Hatchback", "Luxury"),
      },

      // Optional Trip Metrics
      duration: {
        type: DataTypes.FLOAT,
      },
      
      estimatedDistance: {
        type: DataTypes.FLOAT,
      },
      estimatedFare: {
        type: DataTypes.FLOAT,
      },
      actualFare: {
        type: DataTypes.FLOAT,
      },

      // Payment info at trip completion
      paymentMode: {
        type: DataTypes.ENUM("Cash", "Online"),
      },
      cashCollected: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      // Timing Info
      scheduledPickupTime: {
        type: DataTypes.DATE,
      },
      actualPickupTime: {
        type: DataTypes.DATE,
      },
      dropTime: {
        type: DataTypes.DATE,
      },

      // Notes
      specialInstructions: {
        type: DataTypes.TEXT,
      },
      adminNotes: {
        type: DataTypes.TEXT,
      },


    },
    {
      tableName: "CabAssignments",
      timestamps: true,
    }
  );

  return CabAssignment; 
};
