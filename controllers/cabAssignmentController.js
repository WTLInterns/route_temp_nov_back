// const CabAssignment = require('../models');
// const Driver = require('../models');
// const Cab = require('../models');

const { Driver, CabAssignment, CabsDetails, Admin, DriverCashAdjustment } = require("../models");
const mongoose = require("mongoose");
const { Op } = require("sequelize");

const getFreeCabsForDriver = async (req, res) => {
  try {
    const driverId = req.driver.id; // assuming JWT middleware sets this correctly

    // 1. Find the driver by ID
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const adminId = driver.addedBy;

    // 2. Get assignments and all cabs added by that admin
    const [assignments, allCabs] = await Promise.all([
      CabAssignment.findAll({
        where: { assignedBy: adminId },
        include: [
          {
            model: CabsDetails,
          },
        ],
      }),
      CabsDetails.findAll({ where: { addedBy: adminId } }),
    ]);

    // 3. Extract assigned cab IDs
    const assignedCabIds = new Set();
    assignments.forEach((assgn) => {
      if (assgn.status === "assigned" && assgn.cabId) {
        assignedCabIds.add(assgn.cabId.toString());
      }
    });

    // 4. Filter free cabs
    const freeCabs = allCabs.filter(
      (cab) => !assignedCabIds.has(cab.id.toString())
    );

    return res.status(200).json({ freeCabs });
  } catch (err) {
    console.error("Error fetching free cabs:", err);
    return res.status(500).json({
      message: "Error fetching free cabs for driver",
      error: err.message,
    });
  }
};

const freeCabDriver = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Step 1: Fetch all assignments, drivers, and cabs added by this admin
    const [assignments, allDrivers, allCabs] = await Promise.all([
      CabAssignment.findAll({
        where: { assignedBy: adminId },
        include: [{ model: Driver }, { model: CabsDetails }],
      }),
      Driver.findAll({ where: { addedBy: adminId } }),
      CabsDetails.findAll({ where: { addedBy: adminId } }),
    ]);

    // Step 2: Collect assigned cab and driver IDs
    const assignedCabIds = new Set();
    const assignedDriverIds = new Set();

    assignments.forEach((assgn) => {
      if (assgn.status === "assigned") {
        if (assgn.cabId) assignedCabIds.add(assgn.cabId.toString());
        if (assgn.driverId) assignedDriverIds.add(assgn.driverId.toString());
      }
    });

    // Step 3: Filter unassigned (free) drivers and cabs
    const freeDrivers = allDrivers.filter(
      (driver) => !assignedDriverIds.has(driver.id.toString())
    );
    const freeCabs = allCabs.filter(
      (cab) => !assignedCabIds.has(cab.id.toString())
    );

    res.status(200).json({ freeDrivers, freeCabs });
  } catch (err) {
    console.error("Error fetching free cab/driver:", err);
    res.status(500).json({
      message: "Error fetching free cabs and drivers",
      error: err.message,
    });
  }
};

const assignTripToDriver = async (req, res) => {
  try {
    const { driverId, cabNumber, assignedBy } = req.body;

    // ✅ Check required fields
    if (!driverId || !cabNumber || !assignedBy) {
      return res
        .status(400)
        .json({
          message: "Driver ID, Cab Number, and Assigned By are required",
        });
    }

    // ✅ Find cab by ID or cabNumber
    let cab = null;
    if (!isNaN(cabNumber)) {
      // numeric ID
      cab = await CabsDetails.findByPk(cabNumber);
    }
    if (!cab) {
      // search by cabNumber string
      cab = await CabsDetails.findOne({ where: { cabNumber } });
    }

    if (!cab) {
      return res.status(404).json({ message: "Cab not found" });
    }

    // ✅ Check for existing assignment (either driver or cab already assigned and not completed)
    const existingAssignment = await CabAssignment.findOne({
      where: {
        [Op.or]: [
          { driverId, status: { [Op.ne]: "completed" } },
          { cabId: cab.id, status: { [Op.ne]: "completed" } },
        ],
      },
    });

    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "Driver or cab already has an active trip" });
    }

    // ✅ Create new trip assignment
    const assignment = await CabAssignment.create({
      driverId,
      cabId: cab.id,
      assignedBy,
      status: "assigned",
    });

    return res
      .status(201)
      .json({ message: "✅ Trip assigned to driver", assignment });
  } catch (error) {
    console.error("❌ Error assigning trip:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


//correct code with odometer

// const updateTripDetailsByDriver = async (req, res) => {
//   try {
//     const driverId = req.driver.id;

//     const assignment = await CabAssignment.findOne({
//       where: {
//         driverId,
//         status: { [Op.ne]: "completed" },
//       },
//     });

//     if (!assignment) {
//       return res.status(404).json({
//         message: "No active trip found for this driver.",
//       });
//     }

//     const files = req.files || {};
//     const body = req.body || {};
//     const sanitizedBody = Object.fromEntries(
//       Object.entries(body).map(([k, v]) => [k.trim(), v])
//     );

//     const parseJSON = (val) => {
//       if (typeof val !== "string") return val || {};
//       try {
//         return JSON.parse(val);
//       } catch {
//         return {};
//       }
//     };

//     const extractPaths = (field) =>
//       Array.isArray(files[field]) ? files[field].map((f) => f.path) : [];

//     const mergeArray = (existing = [], incoming) =>
//       existing
//         .concat(Array.isArray(incoming) ? incoming : [incoming])
//         .filter((v) => v !== null && v !== undefined && v !== "");

//     const parseNumberArray = (incoming) => {
//       if (incoming === undefined || incoming === null) return [];
//       if (Array.isArray(incoming)) {
//         return incoming
//           .map((v) => {
//             const n = Number(v);
//             return isNaN(n) ? null : n;
//           })
//           .filter((v) => v !== null);
//       }
//       const n = Number(incoming);
//       return isNaN(n) ? [] : [n];
//     };

//     const calculateKm = (meters) =>
//       meters.reduce(
//         (acc, curr, i, arr) =>
//           i === 0 ? acc : acc + Math.max(0, curr - arr[i - 1]),
//         0
//       );

//     // ----------------- BASIC LOCATIONS -----------------
//     const updatedPickupLocation = body.pickupLocation || assignment.pickupLocation || null;
    
//     const updatedDropLocation = body.dropLocation || assignment.dropLocation || null;
   
//     console.log("Updated Pickup Location:", updatedPickupLocation)

//     if (sanitizedBody.location) {
//       assignment.location = {
//         ...assignment.location,
//         ...parseJSON(sanitizedBody.location),
//       };
//     }

//     // ----------------- FUEL -----------------
//     let updatedFuelAmount = mergeArray(
//       assignment.fuelAmount || [],
//       parseNumberArray(body.fuelAmount)
//     );
//     let updatedFuelReceiptImage = mergeArray(
//       assignment.fuelReceiptImage || [],
//       extractPaths("receiptImage")
//     );
//     let updatedFuelTransactionImage = mergeArray(
//       assignment.fuelTransactionImage || [],
//       extractPaths("transactionImage")
//     );

//     let updatedFuelType = assignment.fuelType;
//     if (body.fuelType && ["Cash", "Card"].includes(body.fuelType)) {
//       updatedFuelType = body.fuelType;
//     }

//     // ----------------- FASTTAG -----------------
//     let updatedFastTagAmount = mergeArray(
//       assignment.fastTagAmount || [],
//       parseNumberArray(body.fastTagAmount)
//     );
//     let updatedFastTagPaymentMode = body.fastTagPaymentMode && ["Online Deduction", "Cash", "Card"].includes(body.fastTagPaymentMode)
//       ? body.fastTagPaymentMode
//       : assignment.fastTagPaymentMode;
//     let updatedFastTagCardDetails = body.fastTagCardDetails || assignment.fastTagCardDetails;

//     if (sanitizedBody.fastTag) {
//       const tag = parseJSON(sanitizedBody.fastTag);
//       updatedFastTagAmount = mergeArray(updatedFastTagAmount, parseNumberArray(tag.amount));
//       if (["Online Deduction", "Cash", "Card"].includes(tag.paymentMode)) {
//         updatedFastTagPaymentMode = tag.paymentMode;
//       }
//       if (tag.cardDetails) {
//         updatedFastTagCardDetails = tag.cardDetails;
//       }
//     }

//     // ----------------- TYRE PUNCTURE -----------------
//     let updatedTyreRepairAmount = mergeArray(
//       assignment.tyreRepairAmount || [],
//       parseNumberArray(body.tyreRepairAmount)
//     );
//     let updatedTyreImage = mergeArray(
//       assignment.tyreImage || [],
//       extractPaths("punctureImage")
//     );

//     if (sanitizedBody.tyrePuncture) {
//       const tyre = parseJSON(sanitizedBody.tyrePuncture);
//       updatedTyreRepairAmount = mergeArray(updatedTyreRepairAmount, parseNumberArray(tyre.repairAmount));
//     }

//     // ----------------- VEHICLE SERVICING -----------------
//     let updatedServicingAmount = mergeArray(
//       assignment.servicingAmount || [],
//       parseNumberArray(body.servicingAmount)
//     );
//     let updatedServicingMeter = mergeArray(
//       assignment.servicingMeter || [],
//       parseNumberArray(body.servicingMeter)
//     );
//     let updatedServicingImage = mergeArray(
//       assignment.servicingImage || [],
//       extractPaths("vehicleServicingImage")
//     );
//     let updatedServicingReceiptImage = mergeArray(
//       assignment.servicingReceiptImage || [],
//       extractPaths("vehicleServicingReceiptImage")
//     );

//     if (sanitizedBody.vehicleServicing) {
//       const service = parseJSON(sanitizedBody.vehicleServicing);
//       updatedServicingAmount = mergeArray(updatedServicingAmount, parseNumberArray(service.amount));
//       updatedServicingMeter = mergeArray(updatedServicingMeter, parseNumberArray(service.meter));
//     }

//     // Calculate KM travelled
//     let updatedServicingKmTravelled = updatedServicingMeter.length > 0
//       ? calculateKm(updatedServicingMeter)
//       : assignment.servicingKmTravelled || 0;

//     let updatedservicingRequired = assignment.servicingRequired;

//     // Reset if servicing is completed
//     if (
//       updatedServicingAmount.length > (assignment.servicingAmount?.length || 0) &&
//       updatedservicingRequired
//     ) {
//       updatedServicingKmTravelled = 0;
//       updatedservicingRequired = false;
//       updatedServicingMeter = [];
//     } else if (updatedServicingKmTravelled > 10000) {
//       updatedservicingRequired = true;
//     }

//     // ----------------- OTHER PROBLEMS -----------------
//     let updatedOtherAmount = mergeArray(
//       assignment.otherAmount || [],
//       parseNumberArray(body.otherAmount)
//     );
//     let updatedOtherImage = mergeArray(
//       assignment.otherImage || [],
//       extractPaths("otherProblemsImage")
//     );
//     let updatedOtherDetails = body.otherDetails || assignment.otherDetails || "";

//     if (sanitizedBody.otherProblems) {
//       const other = parseJSON(sanitizedBody.otherProblems);
//       updatedOtherAmount = mergeArray(updatedOtherAmount, parseNumberArray(other.amount));
//       if (other.details) {
//         updatedOtherDetails = other.details;
//       }
//     }

//     // ----------------- UPDATE DB -----------------
//     await assignment.update({
//       pickupLocation: updatedPickupLocation,
//       dropLocation: updatedDropLocation,
//       fuelAmount: updatedFuelAmount,
//       fuelReceiptImage: updatedFuelReceiptImage,
//       fuelTransactionImage: updatedFuelTransactionImage,
//       fuelType: updatedFuelType,
//       fastTagAmount: updatedFastTagAmount,
//       fastTagPaymentMode: updatedFastTagPaymentMode,
//       fastTagCardDetails: updatedFastTagCardDetails,
//       tyreRepairAmount: updatedTyreRepairAmount,
//       tyreImage: updatedTyreImage,
//       servicingAmount: updatedServicingAmount,
//       servicingMeter: updatedServicingMeter,
//       servicingImage: updatedServicingImage,
//       servicingReceiptImage: updatedServicingReceiptImage,
//       servicingKmTravelled: updatedServicingKmTravelled,
//       servicingRequired: updatedservicingRequired,
//       otherAmount: updatedOtherAmount,
//       otherImage: updatedOtherImage,
//       otherDetails: updatedOtherDetails,
//     });

//     const updatedAssignment = await CabAssignment.findByPk(assignment.id);

//     res.status(200).json({
//       message: "✅ Trip details updated successfully",
//       assignment: updatedAssignment,
//     });
//   } catch (err) {
//     console.error("❌ Trip update error:", err);
//     res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };



const updateTripDetailsByDriver = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const assignment = await CabAssignment.findOne({
      where: {
        driverId,
        status: { [Op.ne]: "completed" },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "No active trip found for this driver.",
      });
    }

    const files = req.files || {};
    const body = req.body || {};
    const sanitizedBody = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k.trim(), v])
    );

    const parseJSON = (val) => {
      if (typeof val !== "string") return val || {};
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    };

    const extractPaths = (field) =>
      Array.isArray(files[field]) ? files[field].map((f) => f.path) : [];

    const mergeArray = (existing = [], incoming) =>
      existing
        .concat(Array.isArray(incoming) ? incoming : [incoming])
        .filter((v) => v !== null && v !== undefined && v !== "");

    const parseNumberArray = (incoming) => {
      if (incoming === undefined || incoming === null) return [];
      if (Array.isArray(incoming)) {
        return incoming
          .map((v) => {
            const n = Number(v);
            return isNaN(n) ? null : n;
          })
          .filter((v) => v !== null);
      }
      const n = Number(incoming);
      return isNaN(n) ? [] : [n];
    };

    const parseCoordinate = (value) => {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    // ----------------- BASIC LOCATIONS -----------------
    const updatedPickupLocation = body.pickupLocation || assignment.pickupLocation || null;
    const updatedDropLocation = body.dropLocation || assignment.dropLocation || null;

    console.log("Updated Pickup Location:", updatedPickupLocation);
    console.log("Updated Drop Location:", updatedDropLocation);

    // Log coordinates being received
    console.log("Received coordinates:", {
      pickupLatitude: body.pickupLatitude,
      pickupLongitude: body.pickupLongitude,
      dropLatitude: body.dropLatitude,
      dropLongitude: body.dropLongitude,
    });

    // Parse coordinates early for logging
    const updatedPickupLatitude = parseCoordinate(body.pickupLatitude) ?? assignment.pickupLatitude;
    const updatedPickupLongitude = parseCoordinate(body.pickupLongitude) ?? assignment.pickupLongitude;
    const updatedDropLatitude = parseCoordinate(body.dropLatitude) ?? assignment.dropLatitude;
    const updatedDropLongitude = parseCoordinate(body.dropLongitude) ?? assignment.dropLongitude;

    // Log parsed coordinates
    console.log("Parsed coordinates:", {
      updatedPickupLatitude,
      updatedPickupLongitude,
      updatedDropLatitude,
      updatedDropLongitude,
    });
    if (sanitizedBody.location) {
      assignment.location = {
        ...assignment.location,
        ...parseJSON(sanitizedBody.location),
      };
    }

    // ----------------- FUEL -----------------
    let updatedFuelAmount = mergeArray(
      assignment.fuelAmount || [],
      parseNumberArray(body.fuelAmount)
    );
    let updatedFuelReceiptImage = mergeArray(
      assignment.fuelReceiptImage || [],
      extractPaths("receiptImage")
    );
    let updatedFuelTransactionImage = mergeArray(
      assignment.fuelTransactionImage || [],
      extractPaths("transactionImage")
    );

    let updatedFuelType = assignment.fuelType;
    if (body.fuelType && ["Cash", "Card"].includes(body.fuelType)) {
      updatedFuelType = body.fuelType;
    }

    // ----------------- FASTTAG -----------------
    let updatedFastTagAmount = mergeArray(
      assignment.fastTagAmount || [],
      parseNumberArray(body.fastTagAmount)
    );
    let updatedFastTagPaymentMode = body.fastTagPaymentMode && ["Online Deduction", "Cash", "Card"].includes(body.fastTagPaymentMode)
      ? body.fastTagPaymentMode
      : assignment.fastTagPaymentMode;
    let updatedFastTagCardDetails = body.fastTagCardDetails || assignment.fastTagCardDetails;

    if (sanitizedBody.fastTag) {
      const tag = parseJSON(sanitizedBody.fastTag);
      updatedFastTagAmount = mergeArray(updatedFastTagAmount, parseNumberArray(tag.amount));
      if (["Online Deduction", "Cash", "Card"].includes(tag.paymentMode)) {
        updatedFastTagPaymentMode = tag.paymentMode;
      }
      if (tag.cardDetails) {
        updatedFastTagCardDetails = tag.cardDetails;
      }
    }

    // ----------------- TYRE PUNCTURE -----------------
    let updatedTyreRepairAmount = mergeArray(
      assignment.tyreRepairAmount || [],
      parseNumberArray(body.tyreRepairAmount)
    );
    let updatedTyreImage = mergeArray(
      assignment.tyreImage || [],
      extractPaths("punctureImage")
    );

    if (sanitizedBody.tyrePuncture) {
      const tyre = parseJSON(sanitizedBody.tyrePuncture);
      updatedTyreRepairAmount = mergeArray(updatedTyreRepairAmount, parseNumberArray(tyre.repairAmount));
    }

    // ----------------- VEHICLE SERVICING -----------------
    let updatedServicingAmount = mergeArray(
      assignment.servicingAmount || [],
      parseNumberArray(body.servicingAmount)
    );

    // 🔹 REPLACED servicingMeter with servicingKM
    let updatedServicingMeter= mergeArray(
      assignment.servicingMeter || [],
      parseNumberArray(body.servicingMeter)
    );

    let updatedServicingImage = mergeArray(
      assignment.servicingImage || [],
      extractPaths("vehicleServicingImage")
    );
    let updatedServicingReceiptImage = mergeArray(
      assignment.servicingReceiptImage || [],
      extractPaths("vehicleServicingReceiptImage")
    );

    if (sanitizedBody.vehicleServicing) {
      const service = parseJSON(sanitizedBody.vehicleServicing);
      updatedServicingAmount = mergeArray(updatedServicingAmount, parseNumberArray(service.amount));
      updatedServicingMeter = mergeArray(updatedServicingMeter, parseNumberArray(service.servicingMeter));
    }

    // 🔹 Directly sum trip km
    let updatedServicingKmTravelled = updatedServicingMeter.reduce((a, b) => a + b, 0);

    let updatedservicingRequired = assignment.servicingRequired;

    // Reset if servicing is completed
    if (
      updatedServicingAmount.length > (assignment.servicingAmount?.length || 0) &&
      updatedservicingRequired
    ) {
      updatedServicingKmTravelled = 0;
      updatedservicingRequired = false;
      updatedServicingMeter = [];
    } else if (updatedServicingKmTravelled > 10000) {
      updatedservicingRequired = true;
    }

    // ----------------- OTHER PROBLEMS -----------------
    let updatedOtherAmount = mergeArray(
      assignment.otherAmount || [],
      parseNumberArray(body.otherAmount)
    );
    let updatedOtherImage = mergeArray(
      assignment.otherImage || [],
      extractPaths("otherProblemsImage")
    );
    let updatedOtherDetails = body.otherDetails || assignment.otherDetails || "";

    if (sanitizedBody.otherProblems) {
      const other = parseJSON(sanitizedBody.otherProblems);
      updatedOtherAmount = mergeArray(updatedOtherAmount, parseNumberArray(other.amount));
      if (other.details) {
        updatedOtherDetails = other.details;
      }
    }

    // ----------------- GEOCODE IF NEEDED -----------------
    // If pickup/drop locations changed but no coordinates provided, geocode them
    const axios = require('axios');
    const GOOGLE_MAPS_API_KEY = 'AIzaSyAKjmBSUJ3XR8uD10vG2ptzqLJAZnOlzqI'; // Use your key
    
    let finalPickupLat = updatedPickupLatitude;
    let finalPickupLng = updatedPickupLongitude;
    let finalDropLat = updatedDropLatitude;
    let finalDropLng = updatedDropLongitude;
    
    // Geocode pickup if location exists but coordinates don't
    if (updatedPickupLocation && !updatedPickupLatitude && !updatedPickupLongitude) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
          params: {
            address: updatedPickupLocation,
            key: GOOGLE_MAPS_API_KEY
          }
        });
        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          finalPickupLat = location.lat;
          finalPickupLng = location.lng;
          console.log(`✅ Geocoded pickup: ${updatedPickupLocation} -> ${finalPickupLat}, ${finalPickupLng}`);
        }
      } catch (err) {
        console.log('❌ Geocoding pickup failed:', err.message);
      }
    }
    
    // Geocode drop if location exists but coordinates don't
    if (updatedDropLocation && !updatedDropLatitude && !updatedDropLongitude) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
          params: {
            address: updatedDropLocation,
            key: GOOGLE_MAPS_API_KEY
          }
        });
        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          finalDropLat = location.lat;
          finalDropLng = location.lng;
          console.log(`✅ Geocoded drop: ${updatedDropLocation} -> ${finalDropLat}, ${finalDropLng}`);
        }
      } catch (err) {
        console.log('❌ Geocoding drop failed:', err.message);
      }
    }

    // ----------------- UPDATE DB -----------------
    await assignment.update({
      pickupLocation: updatedPickupLocation,
      dropLocation: updatedDropLocation,
      pickupLatitude: finalPickupLat,
      pickupLongitude: finalPickupLng,
      dropLatitude: finalDropLat,
      dropLongitude: finalDropLng,
      fuelAmount: updatedFuelAmount,
      fuelReceiptImage: updatedFuelReceiptImage,
      fuelTransactionImage: updatedFuelTransactionImage,
      fuelType: updatedFuelType,
      fastTagAmount: updatedFastTagAmount,
      fastTagPaymentMode: updatedFastTagPaymentMode,
      fastTagCardDetails: updatedFastTagCardDetails,
      tyreRepairAmount: updatedTyreRepairAmount,
      tyreImage: updatedTyreImage,
      servicingAmount: updatedServicingAmount,
      servicingMeter: updatedServicingMeter,   // 🔹 updated field
      servicingImage: updatedServicingImage,
      servicingReceiptImage: updatedServicingReceiptImage,
      servicingKmTravelled: updatedServicingKmTravelled,
      servicingRequired: updatedservicingRequired,
      otherAmount: updatedOtherAmount,
      otherImage: updatedOtherImage,
      otherDetails: updatedOtherDetails,
    });

    const updatedAssignment = await CabAssignment.findByPk(assignment.id);

    res.status(200).json({
      message: "✅ Trip details updated successfully",
      assignment: updatedAssignment,
    });
  } catch (err) {
    console.error("❌ Trip update error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};



/**it is Mine code */
// const getAssignCab = async (req, res) => {
//   try {
//     const adminId = req.admin.id;
//     console.log("adminId", adminId);

//     const assignments = await CabAssignment.findAll({
//       where: { assignedBy: adminId },
//       include: [
//         { model: CabsDetails},
//         { model: Driver}
//       ]
//     });

//     res.status(200).json({
//       assignments, // 👈 React code expects this key
//       pagination: null // Optional: if you're handling pagination
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

/**It Team code */

// ---------------- In-memory micro-cache (short TTL) ----------------
const __mcAssign = new Map(); // key -> { ts, headers, body }
const ASSIGN_TTL_MS = 8000;

function mcAGet(key) {
  const e = __mcAssign.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ASSIGN_TTL_MS) {
    __mcAssign.delete(key);
    return null;
  }
  return e;
}
function mcASet(key, value) {
  __mcAssign.set(key, { ts: Date.now(), ...value });
}

const getAssignCab = async (req, res) => {
  try {
    const adminId = req.admin.id;
    console.log("adminId", adminId);

    const cacheKey = `assigncab:${adminId}`;
    const bypass = req.headers['cache-control'] === 'no-cache';
    if (!bypass) {
      const cached = mcAGet(cacheKey);
      if (cached) {
        if (cached.headers) {
          if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
          if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
          if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
        }
        if (req.headers['if-none-match'] && cached.headers?.ETag && req.headers['if-none-match'] === cached.headers.ETag) {
          return res.status(304).end();
        }
        if (req.headers['if-modified-since'] && cached.headers?.['Last-Modified']) {
          const ifMs = new Date(req.headers['if-modified-since']);
          const lastMs = new Date(cached.headers['Last-Modified']);
          if (!isNaN(ifMs) && lastMs <= ifMs) {
            return res.status(304).end();
          }
        }
        return res.status(200).json(cached.body);
      }
    }

    const assignments = await CabAssignment.findAll({
      where: {
        assignedBy: adminId
      },
      include: [
        {
          model: CabsDetails,
        },
        {
          model: Driver,
        },
      ],
    });

    console.log("assignments", assignments);

    const crypto = require('crypto');
    const lastMod = new Date();
    const lastModUTC = lastMod.toUTCString();
    const etagBase = `${adminId}|${assignments?.length || 0}`;
    const etag = crypto.createHash('md5').update(etagBase).digest('hex');
    const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
    res.set('Cache-Control', cacheControl);
    res.set('Last-Modified', lastModUTC);
    res.set('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const ifMs = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
    if (ifMs && lastMod <= ifMs) {
      return res.status(304).end();
    }

    const payload = { assignments };
    mcASet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
    res.status(200).json(payload);
  } catch (error) {
    console.error("Error fetching assigned cabs:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getDriverAssignedCabs= async(req,res)=>{
  const driverId = req.driver.id; 
  console.log("drivreId",driverId)

  const assignment =await CabAssignment.findAll({
    where:{
      driverId:driverId,
      status:"assigned"
    }
  })

  console.log("assignment",assignment)

  if(!assignment){
    return res.status(404).json({message:"No active trip found for this driver."})
  }

  res.status(200).json({assignment:assignment})
}

//without add customerdetails
// const assignCab = async (req, res) => {
//   try {
//     const { driverId, cabNumber, assignedBy } = req.body;

//     if (!driverId || !cabNumber || !assignedBy) {
//       return res.status(400).json({
//         message: 'Driver ID, Cab Number, and Assigned By are required',
//       });
//     }

//     // Find the cab by ID (UUID) or cabNumber
//     let cab;
//     if (/^[0-9a-fA-F]{24}$/.test(cabNumber)) {
//       // If it's in ObjectId format (for backwards compatibility)
//       cab = await CabsDetails.findOne({ where: { id: cabNumber } });
//     } else {
//       cab = await CabsDetails.findOne({ where: { cabNumber } });
//     }

//     if (!cab) {
//       return res.status(404).json({ message: 'Cab not found' });
//     }

//     // Check if driver already has an active assignment
//     const existingDriverAssignment = await CabAssignment.findOne({
//       where: {
//         driverId,
//         status: { [Op.ne]: 'completed' },
//       },
//     });

//     if (existingDriverAssignment) {
//       return res.status(400).json({
//         message: 'This driver already has an active cab assigned',
//       });
//     }

//     // Check if cab is already assigned
//     const existingCabAssignment = await CabAssignment.findOne({
//       where: {
//         cabId: cab.id,
//         status: { [Op.ne]: 'completed' },
//       },
//     });

//     if (existingCabAssignment) {
//       return res.status(400).json({
//         message: 'This cab is already assigned to another driver',
//       });
//     }

//     // Create a new assignment
//     const newAssignment = await CabAssignment.create({
//       driverId,
//       cabId: cab.id,
//       assignedBy,
//       status: 'ongoing', // assuming default is 'ongoing'
//     });

//     res.status(201).json({
//       message: 'Cab assigned successfully',
//       assignment: newAssignment,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };

//assignCabwithcustomerDetails

const assignCab = async (req, res) => {
  try {
    const {
      driverId,
      cabNumber,
      assignedBy,
      customerName,
      customerPhone,
      pickupLocation,
      dropLocation,
      optionalPickupLocations,
      optionalDropLocations,
      tripType,
      vehicleType,
      duration,
      estimatedDistance,
      estimatedFare,
      scheduledPickupTime,
      specialInstructions,
      adminNotes,
    } = req.body;

    // if (
    //   !driverId || !cabNumber || !assignedBy ||
    //   !customerName || !customerPhone || !pickupLocation || !dropLocation ||
    //   !tripType || !vehicleType
    // ) {
    //   return res.status(400).json({
    //     message: "Missing required fields",
    //   });
    // }

    // Find Cab
    let cab;
    if (/^[0-9a-fA-F]{24}$/.test(cabNumber)) {
      cab = await CabsDetails.findOne({ where: { id: cabNumber } });
    } else {
      cab = await CabsDetails.findOne({ where: { cabNumber } });
    }

    if (!cab) {
      return res.status(404).json({ message: "Cab not found" });
    }

    // Check Driver Assignment
    const existingDriverAssignment = await CabAssignment.findOne({
      where: {
        driverId,
        status: { [Op.ne]: "completed" },
      },
    });

    if (existingDriverAssignment) {
      return res.status(400).json({
        message: "Driver already has an active cab assignment",
      });
    }

    // Check Cab Assignment
    const existingCabAssignment = await CabAssignment.findOne({
      where: {
        cabId: cab.id,
        status: { [Op.ne]: "completed" },
      },
    });

    if (existingCabAssignment) {
      return res.status(400).json({
        message: "Cab is already assigned to another driver",
      });
    }

    // Create Assignment
    const newAssignment = await CabAssignment.create({
      driverId,
      cabId: cab.id,
      assignedBy,
      status: "assigned",

      // Customer & Trip Info
      customerName,
      customerPhone,
      pickupLocation,
      dropLocation,
      optionalPickupLocations: Array.isArray(optionalPickupLocations) ? optionalPickupLocations : [],
      optionalDropLocations: Array.isArray(optionalDropLocations) ? optionalDropLocations : [],
      tripType,
      vehicleType,
      duration,
      estimatedDistance,
      estimatedFare,
      scheduledPickupTime,
      specialInstructions,
      adminNotes,
    });

    return res.status(201).json({
      message: "Cab assigned successfully",
      assignment: newAssignment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const driverAssignCab = async (req, res) => {
  try {
    const { cabNumber, assignedBy } = req.body;
    const driverId = req.driver.id; // Authenticated driver
    console.log("cabNumber,assignedBy a", cabNumber, assignedBy, driverId);

    if (!cabNumber || !assignedBy) {
      return res
        .status(400)
        .json({
          message: "Driver ID, Cab Number, and Assigned By are required",
        });
    }

    // ✅ Find cab by cabNumber
    const cab = await CabsDetails.findOne({ where: { cabNumber } });

    if (!cab) {
      return res.status(404).json({ message: "Cab not found" });
    }

    // ✅ Check if driver already has an active assignment
    const existingDriverAssignment = await CabAssignment.findOne({
      where: {
        driverId,
        status: { [Op.ne]: "completed" },
      },
    });

    if (existingDriverAssignment) {
      return res
        .status(400)
        .json({ message: "This driver already has an active cab assigned" });
    }

    // ✅ Check if cab is already assigned
    const existingCabAssignment = await CabAssignment.findOne({
      where: {
        cabId: cab.id,
        status: { [Op.ne]: "completed" },
      },
    });

    if (existingCabAssignment) {
      return res
        .status(400)
        .json({ message: "This cab is already assigned to another driver" });
    }

    // ✅ Assign cab to driver
    const newAssignment = await CabAssignment.create({
      driverId,
      cabId: cab.id,
      assignedBy,
      status: "assigned", // set default if applicable
    });

    res.status(201).json({
      message: "Cab assigned successfully",
      assignment: newAssignment,
    });
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Mark a trip as completed (call this from driver or sub-admin when trip ends)
// const completeTrip = async (req, res) => {
//   try {
//     const assignmentId = req.params.id;
//     const assignment = await CabAssignment.findById(assignmentId);

//     if (!assignment) {
//       return res.status(404).json({ message: "Assignment not found" });
//     }

//     assignment.status = "completed";
//     await assignment.save();

//     res.json({ message: "Trip marked as completed", assignment });
//   } catch (err) {
//     res.status(500).json({ message: "Server Error", error: err.message });
//   }
// };

// ------- Helpers -------
function sumArraySafe(arr) {
  if (!Array.isArray(arr)) return 0
  return arr.reduce((a, b) => a + (Number(b) || 0), 0)
}

function normalizeMode(mode) {
  if (!mode) return null
  const m = String(mode).toLowerCase()
  if (m === 'cash') return 'Cash'
  if (m === 'online') return 'Online'
  return null
}

async function computeDriverCashOnHand(adminId, driverId) {
  const where = { driverId }
  if (adminId) where.assignedBy = adminId

  // All cab trips for this driver (optionally under a specific admin)
  const trips = await CabAssignment.findAll({ where })

  let cashCollected = 0
  let cashExpenses = 0
  for (const t of trips) {
    if (t.paymentMode === 'Cash') cashCollected += Number(t.cashCollected || 0)
    // Fuel cash
    if (t.fuelType === 'Cash') cashExpenses += sumArraySafe(t.fuelAmount)
    // FastTag cash
    if (t.fastTagPaymentMode === 'Cash') cashExpenses += sumArraySafe(t.fastTagAmount)
    // Tyre, Servicing, Other considered cash out by default
    cashExpenses += sumArraySafe(t.tyreRepairAmount)
    cashExpenses += sumArraySafe(t.servicingAmount)
    cashExpenses += sumArraySafe(t.otherAmount)
  }

  // Separate cash adjustments: positive amount = driver handed cash to admin
  const adjWhere = adminId ? { driverId, adminId } : { driverId }
  const adjustments = await DriverCashAdjustment.findAll({ where: adjWhere })
  const totalAdjustments = adjustments.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  // Driver's cash on hand = trips cash - expenses - cash already submitted to admin
  const cashOnHand = cashCollected - cashExpenses - totalAdjustments

  return { cashCollected, cashExpenses, cashOnHand }
}

// Record an admin-side cash submission from a driver and return the updated cash summary
const submitDriverCash = async (req, res) => {
  try {
    const adminId = req.admin?.id
    const { driverId, amount } = req.body || {}

    const driverIdNum = Number(driverId)
    const amountNum = Number(amount)

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized: admin token required" })
    }
    if (!Number.isInteger(driverIdNum) || driverIdNum <= 0) {
      return res.status(400).json({ message: "Invalid driverId" })
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" })
    }

    // Record a cash adjustment instead of creating a fake CabAssignment row
    await DriverCashAdjustment.create({
      driverId: driverIdNum,
      adminId,
      amount: Math.abs(amountNum), // positive = driver paid admin
      note: "Cash submission from admin panel",
    })

    const summary = await computeDriverCashOnHand(adminId, driverIdNum)
    return res.status(200).json(summary)
  } catch (err) {
    console.error("submitDriverCash error", err)
    return res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Admin-wide summary: total cash received from all drivers (cash trips) and current cash in drivers' hands
const getAdminCashSummary = async (req, res) => {
  try {
    const adminId = req.admin.id
    const trips = await CabAssignment.findAll({ where: { assignedBy: adminId } })
    let totalCashReceived = 0
    const perDriver = new Map()

    for (const t of trips) {
      if (t.paymentMode === 'Cash') totalCashReceived += Number(t.cashCollected || 0)
      const d = t.driverId
      if (!perDriver.has(d)) perDriver.set(d, [])
      perDriver.get(d).push(t)
    }

    let cashWithDrivers = 0
    const drivers = []
    for (const [driverId, tlist] of perDriver.entries()) {
      let collected = 0, expenses = 0
      for (const t of tlist) {
        if (t.paymentMode === 'Cash') collected += Number(t.cashCollected || 0)
        if (t.fuelType === 'Cash') expenses += sumArraySafe(t.fuelAmount)
        if (t.fastTagPaymentMode === 'Cash') expenses += sumArraySafe(t.fastTagAmount)
        expenses += sumArraySafe(t.tyreRepairAmount)
        expenses += sumArraySafe(t.servicingAmount)
        expenses += sumArraySafe(t.otherAmount)
      }
      const onHand = collected - expenses
      cashWithDrivers += onHand
      drivers.push({ driverId, cashCollected: collected, cashExpenses: expenses, cashOnHand: onHand })
    }

    return res.json({ totalCashReceived, cashWithDrivers, drivers })
  } catch (err) {
    console.error('getAdminCashSummary error', err)
    return res.status(500).json({ message: 'Server Error', error: err.message })
  }
}

// Driver cash summary by driverId (admin-side)
const getDriverCashSummary = async (req, res) => {
  try {
    const adminId = req.admin.id
    const driverId = req.params.driverId
    const summary = await computeDriverCashOnHand(adminId, driverId)
    return res.json(summary)
  } catch (err) {
    console.error('getDriverCashSummary error', err)
    return res.status(500).json({ message: 'Server Error', error: err.message })
  }
}

// Driver self cash summary (driver token)
const getMyCashSummary = async (req, res) => {
  try {
    const driverId = req.driver.id
    const summary = await computeDriverCashOnHand(null, driverId)
    return res.json(summary)
  } catch (err) {
    console.error('getMyCashSummary error', err)
    return res.status(500).json({ message: 'Server Error', error: err.message })
  }
}

// Export per-cab expenses CSV
const exportCabExpenses = async (req, res) => {
  try {
    const adminId = req.admin.id
    const cabId = req.params.cabId
    const { startDate, endDate } = req.query
    const where = { assignedBy: adminId, cabId }
    // Optional date range filter on dropTime or createdAt fallback
    if (startDate || endDate) {
      const { Op } = require('sequelize')
      const range = {}
      if (startDate) range[Op.gte] = new Date(startDate)
      if (endDate) range[Op.lte] = new Date(endDate)
      // Prefer dropTime if present else createdAt
      where.dropTime = range
    }
    const trips = await CabAssignment.findAll({ where })

    const rows = trips.map(t => ({
      route: `${t.pickupLocation || t.locationFrom || ''} -> ${t.dropLocation || t.locationTo || ''}`.trim(),
      cash_collected: Number(t.cashCollected || 0),
      fuel_total: sumArraySafe(t.fuelAmount),
      tyre_puncture_total: sumArraySafe(t.tyreRepairAmount),
      servicing_total: sumArraySafe(t.servicingAmount),
      other_total: sumArraySafe(t.otherAmount),
      fasttag_total: sumArraySafe(t.fastTagAmount),
      trip_type: t.tripType || '',
      vehicle_type: t.vehicleType || '',
      scheduled_pickup: t.scheduledPickupTime || null,
      completed_at: t.dropTime || null,
    }))

    // Lightweight CSV generator (no external deps)
    const fields = [
      'route',
      'cash_collected',
      'fuel_total',
      'tyre_puncture_total',
      'servicing_total',
      'other_total',
      'fasttag_total',
      'trip_type',
      'vehicle_type',
      'scheduled_pickup',
      'completed_at'
    ]
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return ''
      const s = String(val)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const header = fields.join(',')
    const lines = rows.map(row => fields.map(f => escapeCsv(row[f])).join(','))
    const csv = [header, ...lines].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="cab-${cabId}-expenses.csv"`)
    return res.status(200).send(csv)
  } catch (err) {
    console.error('exportCabExpenses error', err)
    return res.status(500).json({ message: 'Server Error', error: err.message })
  }
}

// List cabs belonging to current subadmin only
const getAdminCabs = async (req, res) => {
  try {
    const adminId = req.admin.id
    const cabs = await CabsDetails.findAll({ where: { addedBy: adminId } })
    return res.json({ cabs })
  } catch (err) {
    console.error('getAdminCabs error', err)
    return res.status(500).json({ message: 'Server Error', error: err.message })
  }
}

const completeTrip = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { paymentMode, cashReceived, actualFare } = req.body || {}

    const assignment = await CabAssignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const mode = normalizeMode(paymentMode) || assignment.paymentMode || null
    const cash = Number(cashReceived)

    assignment.status = "completed";
    if (mode) assignment.paymentMode = mode
    if (!isNaN(cash)) assignment.cashCollected = cash
    if (!isNaN(Number(actualFare))) assignment.actualFare = Number(actualFare)
    assignment.dropTime = new Date()
    await assignment.save();

    // Return driver cash snapshot for immediate UI update
    const summary = await computeDriverCashOnHand(assignment.assignedBy, assignment.driverId)

    res.json({ 
      message: "Trip marked as completed",
      assignment, 
      driverCashSummary: summary 
    });
  } catch (err) {
    console.error('completeTrip error', err)
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const updateAssignmentDetails = async (req, res) => {
  try {
    const admin = req.admin;
    const id = req.params.id;
    const body = req.body || {};

    const assignment = await CabAssignment.findByPk(id);
    if (!assignment) return res.status(404).json({ message: "Cab assignment not found" });

    if (assignment.assignedBy !== admin.id && admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized: You can only modify bookings you created' });
    }

    // Whitelist of fields that can be updated from the create flow
    const updatable = [
      'customerName','customerPhone','pickupLocation','pickupCity','pickupState','pickupLatitude','pickupLongitude',
      'dropLocation','dropCity','dropState','dropLatitude','dropLongitude','estimatedDistance','estimatedFare','duration',
      'scheduledPickupTime','vehicleType','tripType','specialInstructions','paymentMode','adminNotes','totalDistance',
      'actualPickupTime','dropTime','cashCollected','fastTagAmount','otherAmount','otherDetails',
      'optionalPickupLocations','optionalDropLocations'
    ];

    // Normalize types for optional arrays
    const toStringArray = (val) => {
      if (val === null || val === undefined) return undefined
      if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean)
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
      return [String(val)].filter(Boolean)
    }

    // Helpers to sanitize incoming values
    const parseNumOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const parseDateOrNull = (v) => {
      if (!v || v === '') return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const normalizeMode = (m) => {
      if (m === undefined || m === null || m === '') return null;
      const s = String(m).trim().toLowerCase();
      if (!s) return null;
      const map = {
        cash: 'Cash',
        card: 'Card',
        online: 'Online',
        upi: 'Online',
        wallet: 'Online'
      };
      return map[s] || (s.charAt(0).toUpperCase() + s.slice(1));
    };

    for (const key of updatable) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

      // Arrays of strings
      if (key === 'optionalPickupLocations' || key === 'optionalDropLocations') {
        const arr = toStringArray(body[key]);
        if (arr !== undefined) assignment[key] = arr;
        continue;
      }

      // Numeric fields
      if (['estimatedFare','duration','estimatedDistance','cashCollected','totalDistance','dropLatitude','dropLongitude','pickupLatitude','pickupLongitude'].includes(key)) {
        const num = parseNumOrNull(body[key]);
        if (num === null) {
          // Set null to avoid writing "" to numeric columns
          assignment[key] = null;
        } else {
          assignment[key] = num;
        }
        continue;
      }

      // Date/time fields
      if (['scheduledPickupTime','actualPickupTime','dropTime'].includes(key)) {
        const dt = parseDateOrNull(body[key]);
        assignment[key] = dt; // can be null
        continue;
      }

      // Enum-like fields
      if (key === 'paymentMode') {
        const mode = normalizeMode(body[key]);
        assignment[key] = mode; // can be null
        continue;
      }

      // Default: assign as-is
      assignment[key] = body[key];
    }

    // Optionally allow driver/cab change here too (not required – reassign endpoint preferred)
    if (body.driverId !== undefined) {
      const driverIdNum = Number(body.driverId);
      if (!Number.isInteger(driverIdNum)) return res.status(400).json({ message: 'Invalid driverId' });
      assignment.driverId = driverIdNum;
    }
    if (body.cabNumber !== undefined || body.cabId !== undefined) {
      let cab = null;
      if (body.cabId !== undefined) {
        const cabIdNum = Number(body.cabId);
        if (!Number.isInteger(cabIdNum)) return res.status(400).json({ message: 'Invalid cabId' });
        cab = await CabsDetails.findByPk(cabIdNum);
      }
      if (!cab && body.cabNumber) {
        const maybeNum = Number(body.cabNumber);
        if (Number.isInteger(maybeNum)) {
          cab = await CabsDetails.findByPk(maybeNum);
        }
        if (!cab) cab = await CabsDetails.findOne({ where: { cabNumber: body.cabNumber } });
      }
      if (!cab) return res.status(404).json({ message: 'Cab not found for given cabNumber/id' });
      assignment.cabId = cab.id;
    }

    await assignment.save();

    const updated = await CabAssignment.findByPk(assignment.id, {
      include: [{ model: Driver }, { model: CabsDetails }]
    });

    return res.status(200).json({ message: 'Booking updated successfully', assignment: updated });
  } catch (error) {
    console.error('Error in updateAssignmentDetails:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Delete a single booking by id
const deleteAssignment = async (req, res) => {
  try {
    const admin = req.admin;
    const id = req.params.id;

    const assignment = await CabAssignment.findByPk(id);
    if (!assignment) return res.status(404).json({ message: 'Cab assignment not found' });

    if (assignment.assignedBy !== admin.id && admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized: You can only delete bookings you created' });
    }

    await assignment.destroy();
    return res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAssignment:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Reassign an existing assignment to a different driver/cab while preserving trip/customer fields
const reassignTrip = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const adminRole = req.admin.role;
    const assignmentId = req.params.id;
    const { driverId, cabNumber } = req.body;

    if (!assignmentId || !driverId || !cabNumber) {
      return res.status(400).json({ message: "assignmentId (param), driverId and cabNumber are required" });
    }

    const assignment = await CabAssignment.findByPk(assignmentId);
    if (!assignment) return res.status(404).json({ message: "Cab assignment not found" });

    if (assignment.assignedBy !== adminId && adminRole !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized: You can only modify cabs assigned by you" });
    }

    // Coerce and validate IDs
    const driverIdNum = Number(driverId);
    if (!Number.isInteger(driverIdNum)) {
      return res.status(400).json({ message: "Invalid driverId" });
    }

    // Resolve cab by numeric id or by cabNumber string
    let cab = null;
    const maybeNum = Number(cabNumber);
    if (Number.isInteger(maybeNum)) {
      cab = await CabsDetails.findByPk(maybeNum);
    }
    if (!cab) {
      cab = await CabsDetails.findOne({ where: { cabNumber } });
    }
    if (!cab) return res.status(404).json({ message: "Cab not found for given cabNumber/id" });

    assignment.driverId = driverIdNum;
    assignment.cabId = cab.id;
    assignment.status = 'reassigned';
    await assignment.save();

    // Return with associations for UI
    const updated = await CabAssignment.findByPk(assignment.id, {
      include: [
        { model: Driver },
        { model: CabsDetails },
      ]
    });

    return res.status(200).json({ message: "Trip reassigned successfully", assignment: updated });
  } catch (error) {
    console.error("Error in reassignTrip:", error);
    return res.status(500).json({ message: "Server Error", error: error.message, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined });
  }
};

const completeTripByAdmin = async (req, res) => {
  try {
    if (!["superadmin", "subadmin", "Admin"].includes(req.admin.role)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const assignmentId = req.params.id;
    const assignment = await CabAssignment.findByPk(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    assignment.status = "completed";
    await assignment.save();

    res.json({ message: "Trip marked as completed by admin", assignment });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Unassign cab (only owner or super admin)
// const unassignCab = async (req, res) => {
//   try {
//     const adminId = req.admin.id;
//     const adminRole = req.admin.role;

//     const cabAssignment = await CabAssignment.findById(req.params.id);
//     if (!cabAssignment) return res.status(404).json({ message: "Cab assignment not found" });

//     if (cabAssignment.assignedBy.toString() !== adminId && adminRole !== "super-admin") {
//       return res.status(403).json({ message: "Unauthorized: You can only unassign cabs assigned by you" });
//     }

//     await CabAssignment.findByIdAndDelete(req.params.id);
//     res.status(200).json({ message: "Cab unassigned successfully" });
const unassignCab = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const adminRole = req.admin.role;
    const assignmentId = req.params.id || req.body.id;
    const action = (req.query.action || req.body.action || '').toLowerCase();

    // Step 1: Find the cab assignment
    const cabAssignment = await CabAssignment.findByPk(assignmentId);

    if (!cabAssignment) {
      return res.status(404).json({ message: "Cab assignment not found" });
    }

    // Step 2: Check authorization
    if (cabAssignment.assignedBy !== adminId && adminRole !== "superadmin") {
      return res
        .status(403)
        .json({
          message: "Unauthorized: You can only modify cabs assigned by you",
        });
    }

    // Step 3: If cancel action, mark as cancelled; otherwise delete (unassign)
    if (action === 'cancel') {
      cabAssignment.status = 'cancelled';
      await cabAssignment.save();
      return res.status(200).json({ message: "Trip cancelled successfully", assignment: cabAssignment });
    }

    await CabAssignment.destroy({ where: { id: assignmentId } });
    res.status(200).json({ message: "Cab unassigned successfully" });
  } catch (error) {
    console.error("Error in unassignCab:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Get all current (not completed) assignments for logged-in driver
// const getAssignDriver = async (req, res) => {
//   try {
//     const driverId = req.driver.id;
//     const assignments = await CabAssignment.find({ driver: driverId, status: { $ne: "completed" } })
//       .populate("cab")
//       .populate("driver");

//     if (!assignments.length) {
//       return res.status(404).json({ message: "No active cab assignments found for this driver." });
//     }

//     res.status(200).json(assignments);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

const getAssignDriver = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const assignments = await CabAssignment.findAll({
      where: {
        driverId: driverId,
        status: {
          [Op.ne]: "completed",
        },
      },
      include: [
        {
          model: CabsDetails,
        },
        {
          model: Driver,
        },
        {
          model:Admin,
        }
      ],
    });

    if (!assignments.length) {
      return res
        .status(404)
        .json({ message: "No active cab assignments found for this driver." });
    }

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Edit the logged-in driver's profile
// const EditDriverProfile = async (req, res) => {
//   try {
//     const driverId = req.driver.id;
//     const updatedDriver = await Driver.findByIdAndUpdate(driverId, req.body, {
//       new: true,
//       runValidators: true
//     }).select("-password");

//     if (!updatedDriver) return res.status(404).json({ message: "Driver not found" });

//     res.json({ message: "Profile updated successfully", updatedDriver });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const EditDriverProfile = async (req, res) => {
  try {
    const driverId = req.driver.id;

    // Step 1: Update driver record
    const [updatedCount, updatedRows] = await Driver.update(req.body, {
      where: { id: driverId },
      returning: true, // return updated data
    });

    // Step 2: Check if driver was found
    if (updatedCount === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Step 3: Remove password before sending back
    const updatedDriver = updatedRows[0].toJSON();
    delete updatedDriver.password;

    // Step 4: Send response
    res.json({
      message: "Profile updated successfully",
      updatedDriver,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getFreeCabsForDriver,
  freeCabDriver,
  assignCab,
  getAssignCab,
  unassignCab,
  EditDriverProfile,
  getAssignDriver,
  completeTrip,
  getDriverAssignedCabs,
  assignTripToDriver,
  updateTripDetailsByDriver,
  completeTripByAdmin,
  driverAssignCab,
  getAdminCashSummary,
  getDriverCashSummary,
  getMyCashSummary,
  exportCabExpenses,
  getAdminCabs,
  reassignTrip,
  updateAssignmentDetails,
  deleteAssignment,
  submitDriverCash,
};
