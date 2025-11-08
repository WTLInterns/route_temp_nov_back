const express = require('express');
const router = express.Router();
const { assignCab, getAssignCab, unassignCab,getAssignDriver,EditDriverProfile, completeTrip,assignTripToDriver,getDriverAssignedCabs,updateTripDetailsByDriver,driverAssignCab ,freeCabDriver,getFreeCabsForDriver,completeTripByAdmin, getAdminCashSummary, getDriverCashSummary, getMyCashSummary, exportCabExpenses, getAdminCabs } = require('../controllers/cabAssignmentController')
const { reassignTrip, updateAssignmentDetails, deleteAssignment } = require('../controllers/cabAssignmentController')
const { getCompletedTripsByDriver, getMyCompletedTrips } = require('../controllers/driverTripsController')
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const { driverAuthMiddleware } = require("../middleware/driverAuthMiddleware");
const { adminOrDriverAuth, isAdminOrSelfDriver } = require("../middleware/adminOrDriverAuth");
const upload  = require("../middleware/uploadFields")
// ✅ Assign a Cab to a Driver
router.post('/', authMiddleware,isAdmin ,assignCab)

router.post('/driver/cabassign', driverAuthMiddleware,driverAssignCab)


router.get('/driver/getassgnedcab',driverAuthMiddleware, getDriverAssignedCabs)

// ✅ Get all assigned cabs with driver details
router.get('/', authMiddleware,isAdmin ,getAssignCab)

router.put('/', authMiddleware,isAdmin ,unassignCab)
// Allow either body {id} or URL param :id
router.put('/:id', authMiddleware, isAdmin, unassignCab)

// ✅ Reassign an existing assignment while preserving trip/customer fields
router.put('/reassign/:id', authMiddleware, isAdmin, reassignTrip)

// ✅ Edit a booking (update details)
router.put('/edit/:id', authMiddleware, isAdmin, updateAssignmentDetails)

// ✅ Delete a single booking
router.delete('/:id', authMiddleware, isAdmin, deleteAssignment)

router.get('/driver',driverAuthMiddleware,getAssignDriver);

router.put("/profile", driverAuthMiddleware,EditDriverProfile)

router.put("/complete/:id",  driverAuthMiddleware, completeTrip);
router.put("/complete-by-admin/:id", authMiddleware, completeTripByAdmin);

router.post('/new', authMiddleware, assignTripToDriver); 

router.patch('/update-trip', driverAuthMiddleware, upload, updateTripDetailsByDriver); 

router.get('/freeCabsAndDrivers',authMiddleware,freeCabDriver )

router.get('/driver/free-cabs', driverAuthMiddleware, getFreeCabsForDriver);

// Cash summaries
router.get('/cash/summary', authMiddleware, isAdmin, getAdminCashSummary)
router.get('/cash/driver/:driverId', authMiddleware, isAdmin, getDriverCashSummary)
router.get('/cash/me', driverAuthMiddleware, getMyCashSummary)

// Export per-cab expenses CSV
router.get('/cabs/:cabId/expenses/export', authMiddleware, isAdmin, exportCabExpenses)
// List only this admin's cabs
router.get('/admin-cabs', authMiddleware, isAdmin, getAdminCabs)

// Driver completed trips: allow Admins (any driverId) OR Driver token matching :driverId
router.get('/driver/:driverId/completed', adminOrDriverAuth, isAdminOrSelfDriver, getCompletedTripsByDriver)

// Driver self completed trips
router.get('/driver/me/completed', driverAuthMiddleware, getMyCompletedTrips)


module.exports = router;
