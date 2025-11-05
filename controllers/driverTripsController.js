const { Driver, CabAssignment, CabsDetails } = require("../models");

// List completed trips by driverId (admin-side)
const getCompletedTripsByDriver = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    if (!driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    const trips = await CabAssignment.findAll({
      where: { driverId, status: "completed" },
      include: [
        { model: CabsDetails },
        { model: Driver },
      ],
      order: [
        ["dropTime", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    return res.status(200).json({ count: trips.length, trips });
  } catch (err) {
    console.error("getCompletedTripsByDriver error", err);
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// List completed trips for the logged-in driver (driver token)
const getMyCompletedTrips = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const trips = await CabAssignment.findAll({
      where: { driverId, status: "completed" },
      include: [
        { model: CabsDetails },
        { model: Driver },
      ],
      order: [
        ["dropTime", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    return res.status(200).json({ count: trips.length, trips });
  } catch (err) {
    console.error("getMyCompletedTrips error", err);
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = { getCompletedTripsByDriver, getMyCompletedTrips };
