const { DriverSalary, SalaryDeduction, Driver, Admin, Attendance, CabAssignment } = require('../models');
const { Op } = require('sequelize');

exports.setSalary = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const { baseSalary, effectiveFrom, salaryType, perTripRate } = req.body;

    if (baseSalary === undefined || baseSalary === null) {
      return res.status(400).json({ message: 'baseSalary is required' });
    }

    if (salaryType && !['fixed', 'per-trip'].includes(salaryType)) {
      return res.status(400).json({ message: 'salaryType must be either "fixed" or "per-trip"' });
    }

    if (salaryType === 'per-trip' && (!perTripRate || Number(perTripRate) <= 0)) {
      return res.status(400).json({ message: 'perTripRate is required for per-trip salary type' });
    }

    const [driver, admin] = await Promise.all([
      Driver.findByPk(driverId),
      Admin.findByPk(subAdminId),
    ]);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    if (!admin) return res.status(404).json({ message: 'Subadmin not found' });

    const [salary, created] = await DriverSalary.findOrCreate({
      where: { subAdminId, driverId },
      defaults: {
        subAdminId,
        driverId,
        baseSalary,
        currentBalance: baseSalary,
        effectiveFrom: effectiveFrom || null,
        salaryType: salaryType || 'fixed',
        perTripRate: salaryType === 'per-trip' ? perTripRate : 0,
      },
    });

    if (!created) {
      salary.baseSalary = baseSalary;
      if (salary.currentBalance == null) {
        salary.currentBalance = baseSalary;
      }
      if (effectiveFrom !== undefined) salary.effectiveFrom = effectiveFrom || null;
      if (salaryType !== undefined) salary.salaryType = salaryType;
      if (perTripRate !== undefined) salary.perTripRate = salaryType === 'per-trip' ? perTripRate : 0;
      await salary.save();
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Salary set' : 'Salary updated',
      salary,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List all deductions for a subadmin (optionally filter by driverId)
exports.listDeductionsBySubadmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { driverId } = req.query;
    const where = { subAdminId };
    if (driverId) where.driverId = driverId;
    console.log('Fetching deductions for subAdminId:', subAdminId, 'where:', where);
    const deductions = await SalaryDeduction.findAll({ 
      where, 
      order: [['createdAt', 'DESC']],
      raw: true 
    });
    console.log('Found deductions:', deductions.length);
    res.json(deductions);
  } catch (err) {
    console.error('Error in listDeductionsBySubadmin:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
  }
};

// Update a deduction and adjust the driver's currentBalance by the delta
exports.updateDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, date } = req.body;
    const deduction = await SalaryDeduction.findByPk(id);
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });

    const salary = await DriverSalary.findOne({ where: { subAdminId: deduction.subAdminId, driverId: deduction.driverId } });
    if (!salary) return res.status(404).json({ message: 'Salary not set for driver' });

    // Adjust balance: add back old amount, subtract new amount
    const oldAmount = Number(deduction.amount) || 0;
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const delta = oldAmount - newAmount; // positive means increase balance
    salary.currentBalance = (Number(salary.currentBalance) || 0) + delta;

    if (amount !== undefined) deduction.amount = newAmount;
    if (description !== undefined) deduction.description = description;
    if (date !== undefined) deduction.date = date;

    await Promise.all([salary.save(), deduction.save()]);
    res.json({ message: 'Deduction updated', deduction, currentBalance: salary.currentBalance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a deduction and refund the amount back to currentBalance
exports.deleteDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const deduction = await SalaryDeduction.findByPk(id);
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });

    const salary = await DriverSalary.findOne({ where: { subAdminId: deduction.subAdminId, driverId: deduction.driverId } });
    if (!salary) return res.status(404).json({ message: 'Salary not set for driver' });

    const amt = Number(deduction.amount) || 0;
    salary.currentBalance = (Number(salary.currentBalance) || 0) + amt;
    await salary.save();
    await deduction.destroy();
    res.json({ message: 'Deduction deleted', currentBalance: salary.currentBalance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getSalary = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const salary = await DriverSalary.findOne({ where: { subAdminId, driverId } });
    if (!salary) return res.status(404).json({ message: 'Salary not found' });
    res.json(salary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addDeduction = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const { amount, description, date } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be > 0' });
    }

    let salary = await DriverSalary.findOne({ where: { subAdminId, driverId } });
    if (!salary) {
      // Auto-create a salary record with zero base if missing
      salary = await DriverSalary.create({
        subAdminId,
        driverId,
        baseSalary: 0,
        currentBalance: 0,
        effectiveFrom: null,
      });
    }

    const deduction = await SalaryDeduction.create({
      subAdminId,
      driverId,
      amount,
      description: description || null,
      date: date || new Date(),
    });

    // Reduce current balance
    const newBalance = (Number(salary.currentBalance) || 0) - Number(amount);
    salary.currentBalance = newBalance;
    await salary.save();

    res.status(201).json({ message: 'Deduction added and salary updated', deduction, currentBalance: salary.currentBalance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.listDeductions = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const deductions = await SalaryDeduction.findAll({ where: { subAdminId, driverId }, order: [['date', 'DESC']] });
    res.json(deductions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.resetSalaryCycle = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const salary = await DriverSalary.findOne({ where: { subAdminId, driverId } });
    if (!salary) return res.status(404).json({ message: 'Salary not set for driver' });
    salary.currentBalance = salary.baseSalary;
    await salary.save();
    res.json({ message: 'Salary cycle reset to baseSalary', salary });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Helper function to calculate earned salary based on attendance or trips
const calculateEarnedSalary = async (subAdminId, driverId, month, year) => {
  try {
    // Get salary record
    const salary = await DriverSalary.findOne({ where: { subAdminId, driverId } });
    if (!salary || (!salary.baseSalary && !salary.perTripRate)) {
      return {
        baseSalary: 0,
        perDaySalary: 0,
        perTripRate: 0,
        salaryType: 'fixed',
        daysPresent: 0,
        daysAbsent: 0,
        daysHalfDay: 0,
        totalWorkingDays: 0,
        totalTrips: 0,
        earnedSalary: 0
      };
    }

    const baseSalary = Number(salary.baseSalary || 0);
    const perTripRate = Number(salary.perTripRate || 0);
    const salaryType = salary.salaryType || 'fixed';
    const perDaySalary = baseSalary / 30; // Assuming 30 days per month

    // Get date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    if (salaryType === 'per-trip') {
      // Calculate based on completed trips from CabAssignment table
      const trips = await CabAssignment.findAll({
        where: {
          driverId,
          status: 'completed',
          [Op.or]: [
            {
              cabDate: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              assignedAt: {
                [Op.between]: [startDate, endDate]
              }
            }
          ]
        },
        raw: true
      });

      const totalTrips = trips.length;
      const earnedSalary = totalTrips * perTripRate;

      console.log(`Per-trip calculation for driver ${driverId}:`, {
        month,
        year,
        totalTrips,
        perTripRate,
        earnedSalary,
        dateRange: { startDate, endDate }
      });

      return {
        baseSalary,
        perDaySalary: 0,
        perTripRate,
        salaryType,
        daysPresent: 0,
        daysAbsent: 0,
        daysHalfDay: 0,
        totalWorkingDays: 0,
        totalTrips,
        trips: trips, // Include trip details for reference
        earnedSalary: Math.round(earnedSalary * 100) / 100
      };
    } else {
      // Calculate based on attendance (fixed salary)
      const attendanceRecords = await Attendance.findAll({
        where: {
          subAdminId,
          driverId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        raw: true
      });

      // Count attendance by status
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysHalfDay = 0;

      attendanceRecords.forEach(record => {
        switch (record.status) {
          case 'Present':
            daysPresent++;
            break;
          case 'Absent':
            daysAbsent++;
            break;
          case 'Half-Day':
            daysHalfDay++;
            break;
        }
      });

      // Calculate earned salary
      // Present = full day salary, Half-Day = 50% salary, Absent = 0
      const earnedSalary = (daysPresent * perDaySalary) + (daysHalfDay * perDaySalary * 0.5);

      return {
        baseSalary,
        perDaySalary,
        perTripRate,
        salaryType,
        daysPresent,
        daysAbsent,
        daysHalfDay,
        totalWorkingDays: daysPresent + daysAbsent + daysHalfDay,
        totalTrips: 0,
        earnedSalary: Math.round(earnedSalary * 100) / 100
      };
    }
  } catch (err) {
    console.error('Error calculating earned salary:', err);
    return {
      baseSalary: 0,
      perDaySalary: 0,
      perTripRate: 0,
      salaryType: 'fixed',
      daysPresent: 0,
      daysAbsent: 0,
      daysHalfDay: 0,
      totalWorkingDays: 0,
      totalTrips: 0,
      earnedSalary: 0
    };
  }
};

// Get salary with attendance-based calculation
exports.getSalaryWithAttendance = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year query parameters are required (e.g., ?month=11&year=2025)' });
    }

    // Get salary record
    const salary = await DriverSalary.findOne({ where: { subAdminId, driverId } });
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found' });
    }

    // Calculate earned salary based on attendance
    const attendanceCalc = await calculateEarnedSalary(subAdminId, driverId, parseInt(month), parseInt(year));

    // Get deductions for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const deductions = await SalaryDeduction.findAll({
      where: {
        subAdminId,
        driverId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      raw: true
    });

    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);

    // Calculate final remaining salary
    const remainingSalary = attendanceCalc.earnedSalary - totalDeductions;

    res.json({
      baseSalary: attendanceCalc.baseSalary,
      perDaySalary: attendanceCalc.perDaySalary,
      perTripRate: attendanceCalc.perTripRate,
      salaryType: attendanceCalc.salaryType,
      attendance: {
        daysPresent: attendanceCalc.daysPresent,
        daysAbsent: attendanceCalc.daysAbsent,
        daysHalfDay: attendanceCalc.daysHalfDay,
        totalWorkingDays: attendanceCalc.totalWorkingDays
      },
      trips: {
        totalTrips: attendanceCalc.totalTrips
      },
      earnedSalary: attendanceCalc.earnedSalary,
      totalDeductions,
      remainingSalary,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (err) {
    console.error('Error in getSalaryWithAttendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all drivers' salary with attendance for a subadmin
exports.getAllDriversSalaryWithAttendance = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'month and year query parameters are required' });
    }

    // Get all salary records for this subadmin
    const salaries = await DriverSalary.findAll({ where: { subAdminId }, raw: true });

    const result = [];

    for (const salary of salaries) {
      const driverId = salary.driverId;

      // Calculate earned salary based on attendance
      const attendanceCalc = await calculateEarnedSalary(subAdminId, driverId, parseInt(month), parseInt(year));

      // Get deductions for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const deductions = await SalaryDeduction.findAll({
        where: {
          subAdminId,
          driverId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        raw: true
      });

      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
      const remainingSalary = attendanceCalc.earnedSalary - totalDeductions;

      result.push({
        driverId,
        baseSalary: attendanceCalc.baseSalary,
        perDaySalary: attendanceCalc.perDaySalary,
        perTripRate: attendanceCalc.perTripRate,
        salaryType: attendanceCalc.salaryType,
        attendance: {
          daysPresent: attendanceCalc.daysPresent,
          daysAbsent: attendanceCalc.daysAbsent,
          daysHalfDay: attendanceCalc.daysHalfDay,
          totalWorkingDays: attendanceCalc.totalWorkingDays
        },
        trips: {
          totalTrips: attendanceCalc.totalTrips
        },
        earnedSalary: attendanceCalc.earnedSalary,
        totalDeductions,
        remainingSalary
      });
    }

    res.json({
      month: parseInt(month),
      year: parseInt(year),
      drivers: result
    });
  } catch (err) {
    console.error('Error in getAllDriversSalaryWithAttendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
