
// const Servicing = require("../models/ServicingAssignment");
// const Cabassigment = require("../models/CabAssignment");

// // ✅ Assign servicing (admin only)
// exports.assignServicing = async (req, res) => {
//   try {
//     const { cabId, driverId, serviceDate } = req.body;

//     const newService = await new Servicing({
//       cab: cabId,
//       driver: driverId,
//       assignedBy: req.admin.id,
//       serviceDate,
//     }).save();

//     res.status(201).json({
//       message: "Cab assigned for servicing",
//       servicing: newService,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };


// // ✅ Driver updates status with receipt and cost
// exports.updateServicingStatus = async (req, res) => {
//   try {
//     const servicing = await Servicing.findById(req.params.id);
//     if (!servicing) {
//       return res.status(404).json({ error: "Servicing not found" });
//     }

//     if (servicing.driver.toString() !== req.driver.id) {
//       return res.status(403).json({ error: "Unauthorized" });
//     }

//     // Update servicing details
//     servicing.receiptImage = req.file?.path || servicing.receiptImage;
//     servicing.servicingAmount = req.body.servicingCost || servicing.servicingAmount;
//      servicing.status = "completed";                 //***** */

//     const cabAssignment = await Cabassigment.findOne({ cab: servicing.cab });
//     if (!cabAssignment) {
//       return res.status(404).json({ error: "Cab assignment not found" });
//     }

//     // Update trip details
//     const meters = cabAssignment.tripDetails?.vehicleServicing?.meter || [];
//     const lastMeter = meters.length ? meters[meters.length - 1] : 0;

//     cabAssignment.tripDetails.vehicleServicing.meter = [];
//     cabAssignment.tripDetails.vehicleServicing.kmTravelled = 0;

//     // Save both in parallel
//     await Promise.all([servicing.save(), cabAssignment.save()]);

//     res.status(200).json({
//       message: "Servicing updated successfully",
//       servicing,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };

// // ✅ Driver gets assigned (pending) servicings
// exports.getAssignedServicings = async (req, res) => {
//   try {
//     const services = await Servicing.find({
//       driver: req.driver.id,
//         status:"pending"
//     })
//       .populate("cab")
//       .populate("driver");

//     res.status(200).json({ services });
//   } catch (err) {
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };

// // ✅ Admin gets all assigned servicings
// exports.getAssignedServicingsAdmin = async (req, res) => {
//   try {
//     const services = await Servicing.find({
//       assignedBy: req.admin.id,
//     })
//       .populate("cab")
//       .populate("driver");

//     res.status(200).json({ services });
//   } catch (err) {
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };


const { ServicingAssignment, CabsDetails, Driver, CabAssignment } = require("../models");

exports.assignServicing = async (req, res) => {
  try {
    const { cabId, driverId, serviceDate } = req.body;

    if (!cabId || !driverId || !serviceDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newService = await ServicingAssignment.create({
      cabId,
      driverId,
      assignedBy: req.admin.id,
      serviceDate,
    });

    res.status(201).json({
      message: "Cab assigned for servicing",
      servicing: newService,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.updateServicingStatus = async (req, res) => {
  try {
    const servicingId = req.params.id;
    const driverId = req.driver.id;

    // 1️⃣ Find servicing assignment
    const servicing = await ServicingAssignment.findByPk(servicingId);
    if (!servicing) {
      return res.status(404).json({ error: "Servicing not found" });
    }

    // 2️⃣ Authorization check
    if (servicing.driverId !== driverId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // 3️⃣ Update servicing details
    servicing.receiptImage =
      req.file?.path || req.body.receiptImage || servicing.receiptImage;
    servicing.servicingAmount =
      req.body.servicingAmount || servicing.servicingAmount;
    servicing.status = "completed";

    // 4️⃣ Find related cab assignment
    const cabAssignment = await CabAssignment.findOne({
      where: { cabId: servicing.cabId, driverId },
    });

    if (!cabAssignment) {
      return res.status(404).json({ error: "Cab assignment not found" });
    }

    // 5️⃣ Reset servicing and trip data
    cabAssignment.servicingRequired = false;
    cabAssignment.servicingKmTravelled = 0;
    cabAssignment.servicingMeter = [];  // ✅ reset array properly
    cabAssignment.servicingTotalKm = 0; // ✅ reset total if needed

    // 6️⃣ Save updates
    await Promise.all([servicing.save(), cabAssignment.save()]);

    res.status(200).json({
      message: "Servicing completed successfully",
      servicing,
      cabAssignment,
    });
  } catch (err) {
    console.error("Error updating servicing:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ---------------- In-memory micro-cache (short TTL) ----------------
const __mcServ = new Map(); // key -> { ts, headers, body }
const SERV_TTL_MS = 8000;

function mcSGet(key) {
  const e = __mcServ.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > SERV_TTL_MS) {
    __mcServ.delete(key);
    return null;
  }
  return e;
}
function mcSSet(key, value) {
  __mcServ.set(key, { ts: Date.now(), ...value });
}

exports.getAssignedServicings = async (req, res) => {
  try {
    const cacheKey = `serv:driver:${req.driver?.id || 'unknown'}`;
    const bypass = req.headers['cache-control'] === 'no-cache';
    if (!bypass) {
      const cached = mcSGet(cacheKey);
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

    const services = await ServicingAssignment.findAll({
      where: { driverId: req.driver.id, status: "pending" },
      include: [
        { model: CabsDetails },
        { model: Driver },
      ],
    });

    const crypto = require('crypto');
    const lastMod = new Date();
    const lastModUTC = lastMod.toUTCString();
    const etagBase = `${req.driver?.id || 'unknown'}|${services?.length || 0}`;
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

    const payload = { services };
    mcSSet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ✅ Admin gets all assigned servicings
exports.getAssignedServicingsAdmin = async (req, res) => {
  try {
    const cacheKey = `serv:admin:${req.admin?.id || 'unknown'}`;
    const bypass = req.headers['cache-control'] === 'no-cache';
    if (!bypass) {
      const cached = mcSGet(cacheKey);
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

    const services = await ServicingAssignment.findAll({
      where: { assignedBy: req.admin.id },
      include: [
        { model: CabsDetails },
        { model: Driver },
      ],
    });

    const crypto = require('crypto');
    const lastMod = new Date();
    const lastModUTC = lastMod.toUTCString();
    const etagBase = `${req.admin?.id || 'unknown'}|${services?.length || 0}`;
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

    const payload = { services };
    mcSSet(cacheKey, { headers: { 'Cache-Control': cacheControl, 'Last-Modified': lastModUTC, 'ETag': etag }, body: payload });
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};


// get single servicing by servicingId
exports.getServicingById = async (req, res) => {
  try {
    const { id } = req.params;

    const servicing = await ServicingAssignment.findByPk(id);

    if (!servicing) {
      return res.status(404).json({ message: "Servicing not found" });
    }

    res.status(200).json({ servicing });
  } catch (err) {
    console.error("Error fetching servicing by ID:", err);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
};





