const express = require('express');
const {
  setSalary,
  getSalary,
  addDeduction,
  listDeductions,
  resetSalaryCycle,
  listDeductionsBySubadmin,
  updateDeduction,
  deleteDeduction,
  getSalaryWithAttendance,
  getAllDriversSalaryWithAttendance,
} = require('../controllers/salaryController');

const router = express.Router();

// List all deductions for a subadmin (optional ?driverId=) - MUST BE BEFORE /:subAdminId/:driverId/deductions
router.get('/subadmin/:subAdminId/deductions', listDeductionsBySubadmin);

// Get all drivers' salary with attendance calculation for a subadmin (requires ?month=&year=)
router.get('/subadmin/:subAdminId/attendance-salary', getAllDriversSalaryWithAttendance);

// Update a deduction
router.put('/deductions/:id', updateDeduction);

// Delete a deduction
router.delete('/deductions/:id', deleteDeduction);

// Set or update salary for a driver
router.post('/:subAdminId/:driverId/set', setSalary);

// Get salary for a driver
router.get('/:subAdminId/:driverId', getSalary);

// Get salary with attendance calculation (requires ?month=&year=)
router.get('/:subAdminId/:driverId/attendance-salary', getSalaryWithAttendance);

// Add a salary deduction
router.post('/:subAdminId/:driverId/deduct', addDeduction);

// List deductions for a driver
router.get('/:subAdminId/:driverId/deductions', listDeductions);

// Reset salary cycle to baseSalary
router.post('/:subAdminId/:driverId/reset', resetSalaryCycle);

module.exports = router;
