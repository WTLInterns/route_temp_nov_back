const express = require('express');
const {
  createOrUpdateAttendance,
  getAttendanceByDriver,
  updateAttendance,
  deleteAttendance,
  listBySubadmin,
} = require('../controllers/attendanceController');

const router = express.Router();

// List attendance by subadmin, optional ?driverId=&date= - MUST BE BEFORE /:subAdminId/:driverId
router.get('/subadmin/:subAdminId', listBySubadmin);

// Update specific attendance record
router.put('/:id', updateAttendance);

// Delete attendance
router.delete('/:id', deleteAttendance);

// Create or update attendance for a day
router.post('/:subAdminId/:driverId', createOrUpdateAttendance);

// Get attendance by driver, optional ?date=YYYY-MM-DD
router.get('/:subAdminId/:driverId', getAttendanceByDriver);

module.exports = router;
