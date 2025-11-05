// const Cab = require("../models/CabAssignment");
// const Driver = require("../models/loginModel")
const mongoose = require("mongoose");
const path = require("path");
const { Cab, CabsDetails,CabAssignment } = require("../models");
// const { Cab, CabDetails, } = require("../models");
const { Op, Sequelize } = require('sequelize');


const getCabs = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { cabNumber } = req.body;

    // Corrected populate fields
    const cabs = await Cab.find({ cabNumber: cabNumber })

    res.status(200).json(cabs);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getCabById = async (req, res) => {
  try {
    const { cabNumber } = req.params;
    const adminId = req.admin.id; // Extract admin ID from token (set by middleware)

    // Find cab assigned to the requesting admin
    const cab = await Cab.findOne({ cabNumber, addedBy: adminId }).populate("Driver").populate('cabNumber');;

    if (!cab) {
      return res.status(404).json({ message: "Cab not found or unauthorized access" });
    }

    res.status(200).json(cab);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cab details", error: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////

const addCab = async (req, res) => {
  try {
    const {
      cabNumber,
      location,
      totalDistance,
      dateTime,
      fuel,
      fastTag,
      tyrePuncture,
      vehicleServicing,
      otherProblems,
      driverId,
      addedBy,
    } = req.body;

    if (!cabNumber) {
      return res.status(400).json({ message: "Cab number is required" });
    }

    // Safe parsing
    const safeParse = (data) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (err) {
        throw new Error(`Invalid JSON format`);
      }
    };

    const parsedLocation = safeParse(location);
    const parsedFuel = safeParse(fuel);
    const parsedFastTag = safeParse(fastTag);
    const parsedTyrePuncture = safeParse(tyrePuncture);
    const parsedVehicleServicing = safeParse(vehicleServicing);
    const parsedOtherProblems = safeParse(otherProblems);

    const uploadedImages = {
      fuel: {
        receiptImage: req.files?.receiptImage?.[0]?.path || null,
        transactionImage: req.files?.transactionImage?.[0]?.path || null,
      },
      tyrePuncture: {
        image: req.files?.punctureImage?.[0]?.path || null,
      },
      otherProblems: {
        image: req.files?.otherProblemsImage?.[0]?.path || null,
      },
      vehicleServicing: {
        image: req.files?.vehicleServicingImage?.[0]?.path || null,
      },
    };

    console.log("Cab model:", Cab); 
    console.log("CabsDetails model:", CabsDetails);
    // ✅ Find cabNumber in CabDetails table
    const cabDetails = await CabsDetails.findOne({ where: { cabNumber } });

    if (!cabDetails) {
      return res.status(404).json({ message: "Cab number not found in CabDetails" });
    }

    // ✅ Check if cab with driver already exists
    const existingCab = await Cab.findOne({
      where: {
        cabNumberId: cabDetails.id,
        driverId,
      },
    });

    if (!existingCab) {
      // 🔹 Create new Cab
      const newCab = await Cab.create({
        cabNumberId: cabDetails.id,
        driverId,
        addedBy,


        // Location Info
        location_from: parsedLocation?.from || null,
        location_to: parsedLocation?.to || null,
        dateTime,
        totalDistance,

        // Fuel
        fuel_type: parsedFuel?.type || null,
        fuel_amount: parsedFuel?.amount || [],
        fuel_receiptImage: uploadedImages.fuel.receiptImage,
        fuel_transactionImage: uploadedImages.fuel.transactionImage,

        // FastTag
        fastTag_paymentMode: parsedFastTag?.paymentMode || null,
        fastTag_amount: parsedFastTag?.amount || [],
        fastTag_cardDetails: parsedFastTag?.cardDetails || null,

        // Tyre Puncture
        tyrePuncture_image: uploadedImages.tyrePuncture.image,
        tyrePuncture_repairAmount: parsedTyrePuncture?.repairAmount || [],

        // Vehicle Servicing
        vehicleServicing_requiredService: parsedVehicleServicing?.requiredService || false,
        vehicleServicing_details: parsedVehicleServicing?.details || null,
        vehicleServicing_image: uploadedImages.vehicleServicing.image,

        // Other Problems
        otherProblems_image: uploadedImages.otherProblems.image,
        otherProblems_details: parsedOtherProblems?.details || null,
        otherProblems_amount: parsedOtherProblems?.amount || [],
      });

      return res.status(201).json({ message: "Cab added successfully", cab: newCab });
    }

    // 🔹 Update existing cab
    const updatedCab = await existingCab.update({
      location_from: parsedLocation?.from ?? existingCab.location_from,
      location_to: parsedLocation?.to ?? existingCab.location_to,
      dateTime: dateTime || existingCab.dateTime,
      totalDistance: totalDistance || existingCab.totalDistance,

      fuel_type: parsedFuel?.type ?? existingCab.fuel_type,
      fuel_amount: parsedFuel?.amount ?? existingCab.fuel_amount,
      fuel_receiptImage: uploadedImages.fuel.receiptImage || existingCab.fuel_receiptImage,
      fuel_transactionImage: uploadedImages.fuel.transactionImage || existingCab.fuel_transactionImage,

      fastTag_paymentMode: parsedFastTag?.paymentMode ?? existingCab.fastTag_paymentMode,
      fastTag_amount: parsedFastTag?.amount ?? existingCab.fastTag_amount,
      fastTag_cardDetails: parsedFastTag?.cardDetails ?? existingCab.fastTag_cardDetails,

      tyrePuncture_image: uploadedImages.tyrePuncture.image || existingCab.tyrePuncture_image,
      tyrePuncture_repairAmount: parsedTyrePuncture?.repairAmount ?? existingCab.tyrePuncture_repairAmount,

      vehicleServicing_requiredService: parsedVehicleServicing?.requiredService ?? existingCab.vehicleServicing_requiredService,
      vehicleServicing_details: parsedVehicleServicing?.details ?? existingCab.vehicleServicing_details,
      vehicleServicing_image: uploadedImages.vehicleServicing.image || existingCab.vehicleServicing_image,

      otherProblems_image: uploadedImages.otherProblems.image || existingCab.otherProblems_image,
      otherProblems_details: parsedOtherProblems?.details ?? existingCab.otherProblems_details,
      otherProblems_amount: parsedOtherProblems?.amount ?? existingCab.otherProblems_amount,
    });

    return res.status(200).json({ message: "Cab updated successfully", cab: updatedCab });

  } catch (error) {
    console.error("Error in addCab:", error);
    res.status(500).json({ message: "Error adding/updating cab", error: error.message });
  }
};

//updated with sequelize but not test in postman 
const updateCab = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // Assuming req.user is set via authentication middleware

  // ✅ Check if the cab exists
  const existingCab = await Cab.findByPK(id);

  if (!existingCab) {
    res.status(404);
    throw new Error("Cab not found");
  }

  // ✅ Ensure only the owner admin can update
  if (existingCab.addedBy.toString() !== adminId) {
    res.status(403);
    throw new Error("Unauthorized: You are not allowed to update this cab");
  }

  const updatedFields = { ...req.body };

  // ✅ Handle image uploads safely
  if (req.files) {
    if (req.files.receiptImage) {
      updatedFields.fuel = updatedFields.fuel || {};
      updatedFields.fuel.receiptImage = req.files.receiptImage[0].path;
    }
    if (req.files.transactionImage) {
      updatedFields.fuel = updatedFields.fuel || {};
      updatedFields.fuel.transactionImage = req.files.transactionImage[0].path;
    }
    if (req.files.punctureImage) {
      updatedFields.tyrePuncture = updatedFields.tyrePuncture || {};
      updatedFields.tyrePuncture.image = req.files.punctureImage[0].path;
    }
  }

  // ✅ Update cab details
  const updatedCab = await Cab.findByIdAndUpdate(id, updatedFields, { new: true });

  if (!updatedCab) {
    res.status(500);
    throw new Error("Failed to update cab");
  }

  res.status(200).json({ message: "Cab updated successfully", cab: updatedCab });
};


const deleteCab = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // Assuming req.user is set via authentication middleware

  // ✅ Check if the cab exists
  const cab = await Cab.findById(id);
  if (!cab) {
    res.status(404);
    throw new Error("Cab not found");
  }

  // ✅ Ensure only the owner admin can delete
  if (cab.addedBy.toString() !== adminId) {
    res.status(403);
    throw new Error("Unauthorized: You are not allowed to delete this cab");
  }

  // ✅ Delete the cab
  await cab.deleteOne();

  res.status(200).json({ message: "Cab deleted successfully", deletedCab: cab });
};    //not used

const cabList = async (req, res) => {
  try {
    const adminId = req.admin.id;

    // Fetch all cabs for this admin and include their CabDetails (cabNumber)
    const cabs = await Cab.findAll({
      where: { addedBy: adminId },
      include: [
        {
          model: CabsDetails,
          as: 'CabDetails',
          attributes: ['cabNumber']
        }
      ],
      attributes: [
        'cabNumberId',
        [Sequelize.fn('SUM', Sequelize.cast(Sequelize.col('locationTotalDistance'), 'double precision')), 'totalDistance']
      ],
      group: ['cabNumberId', 'CabDetail.id'],
      having: Sequelize.literal(`SUM(CAST("location_totalDistance" AS double precision)) > 10000`),
      order: [[Sequelize.literal('totalDistance'), 'DESC']]
    });

    // Format response
    const formatted = cabs.map(cab => ({
      cabNumber: cab.CabDetail.cabNumber,
      totalDistance: parseFloat(cab.get('totalDistance'))
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/////////////////////////////////////////////////////////////////////////////////////

// ---------------- In-memory micro-cache (short TTL) ----------------
const __microCache = new Map(); // key -> { ts, headers, body }
const MC_TTL_MS = 8000; // 8 seconds

function mcGet(key) {
  const e = __microCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > MC_TTL_MS) {
    __microCache.delete(key);
    return null;
  }
  return e;
}
function mcSet(key, value) {
  __microCache.set(key, { ts: Date.now(), ...value });
}

const cabExpensive = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { fromDate, toDate } = req.query;

    const whereClause = { assignedBy: adminId };

    // try micro-cache (vary by admin + date filters)
    const cacheKey = `cabExp:${adminId}|${fromDate || ''}|${toDate || ''}`;
    const ccBypass = req.headers['cache-control'] === 'no-cache';
    if (!ccBypass) {
      const cached = mcGet(cacheKey);
      if (cached) {
        if (cached.headers) {
          if (cached.headers['Cache-Control']) res.set('Cache-Control', cached.headers['Cache-Control']);
          if (cached.headers['Last-Modified']) res.set('Last-Modified', cached.headers['Last-Modified']);
          if (cached.headers['ETag']) res.set('ETag', cached.headers['ETag']);
        }
        // Conditional GET support
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

    if (fromDate && toDate) {
      whereClause.cabDate = {
        [Op.gte]: new Date(fromDate),
        [Op.lte]: new Date(toDate),
      };
    }

    const assignments = await CabAssignment.findAll({ where: whereClause });

    if (!assignments || assignments.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No cab assignments found for the given criteria." });
    }

    const expenses = assignments.map((assignment) => {
      const fuel = Array.isArray(assignment.fuelAmount)
        ? assignment.fuelAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const fastTag = Array.isArray(assignment.fastTagAmount)
        ? assignment.fastTagAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const tyrePuncture = Array.isArray(assignment.tyreRepairAmount)
        ? assignment.tyreRepairAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const otherProblems = Array.isArray(assignment.otherAmount)
        ? assignment.otherAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const servicing = Array.isArray(assignment.servicingAmount)
        ? assignment.servicingAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const totalExpense = fuel + fastTag + tyrePuncture + otherProblems + servicing;

      return {
        assignmentId: assignment.id,
        cabId: assignment.cabId,
        cabDate: assignment.cabDate,
        pickupLocation: assignment.pickupLocation || assignment.locationFrom || assignment.pickupHistory || null,
        dropLocation: assignment.dropLocation || assignment.locationTo || assignment.dropHistory || null,
        totalExpense,
        breakdown: {
          fuel,
          fastTag,
          tyrePuncture,
          servicing,
          otherProblems,
        },
      };
    });

    expenses.sort((a, b) => b.totalExpense - a.totalExpense);

    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: "No expenses found after calculation!" });
    }

    // Set lightweight cache headers
    const lastMod = new Date();
    const lastModUTC = lastMod.toUTCString();
    const etagBase = `${adminId}|${fromDate || ''}|${toDate || ''}|${expenses.length}|${expenses[0]?.totalExpense || 0}`;
    const crypto = require('crypto');
    const etag = crypto.createHash('md5').update(etagBase).digest('hex');
    const cacheControl = 'private, max-age=5, stale-while-revalidate=30';
    res.set('Cache-Control', cacheControl);
    res.set('Last-Modified', lastModUTC);
    res.set('ETag', etag);

    // Conditional GET
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const ifMs = req.headers['if-modified-since'] ? new Date(req.headers['if-modified-since']) : null;
    if (ifMs && lastMod <= ifMs) {
      return res.status(304).end();
    }

    const payload = { success: true, data: expenses };
    mcSet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
    res.status(200).json(payload);
  } catch (error) {
    console.error("Error fetching cab expenses:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};




module.exports = { getCabs, getCabById, addCab, updateCab, deleteCab, cabList, cabExpensive };

