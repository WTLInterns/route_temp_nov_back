const { Attendance, Driver, Admin } = require('../models');

exports.createOrUpdateAttendance = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const { date, punchIn, punchOut, notes, status } = req.body;

    if (!date || !punchIn) {
      return res.status(400).json({ message: 'date and punchIn are required' });
    }

    // Validate status if provided
    const validStatuses = ['Present', 'Absent', 'Half-Day'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Present, Absent, or Half-Day' });
    }

    // Ensure driver and admin exist
    const [driver, admin] = await Promise.all([
      Driver.findByPk(driverId),
      Admin.findByPk(subAdminId),
    ]);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    if (!admin) return res.status(404).json({ message: 'Subadmin not found' });

    // Upsert by composite (subAdminId, driverId, date)
    const [record, created] = await Attendance.findOrCreate({
      where: { subAdminId, driverId, date },
      defaults: { 
        subAdminId, 
        driverId, 
        date, 
        punchIn, 
        punchOut: punchOut || null, 
        notes,
        status: status || 'Present'
      },
    });

    if (!created) {
      record.punchIn = punchIn;
      if (punchOut !== undefined) record.punchOut = punchOut;
      if (notes !== undefined) record.notes = notes;
      if (status !== undefined) record.status = status;
      await record.save();
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Attendance created' : 'Attendance updated',
      attendance: record,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAttendanceByDriver = async (req, res) => {
  try {
    const { subAdminId, driverId } = req.params;
    const { date } = req.query;

    const where = { subAdminId, driverId };
    if (date) where.date = date;

    const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { punchIn, punchOut, notes, date, status } = req.body;

    // Validate status if provided
    const validStatuses = ['Present', 'Absent', 'Half-Day'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Present, Absent, or Half-Day' });
    }

    const record = await Attendance.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Attendance not found' });

    if (date !== undefined) record.date = date;
    if (punchIn !== undefined) record.punchIn = punchIn;
    if (punchOut !== undefined) record.punchOut = punchOut;
    if (notes !== undefined) record.notes = notes;
    if (status !== undefined) record.status = status;

    await record.save();
    res.json({ message: 'Attendance updated', attendance: record });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Attendance.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Attendance not found' });
    await record.destroy();
    res.json({ message: 'Attendance deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List attendance by subadmin, optional filters: driverId, date
exports.listBySubadmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { driverId, date } = req.query;
    console.log('Fetching attendance for subAdminId:', subAdminId, 'filters:', { driverId, date });
    const where = { subAdminId };
    if (driverId) where.driverId = driverId;
    if (date) where.date = date;
    const records = await Attendance.findAll({ 
      where, 
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      raw: true 
    });
    console.log('Found attendance records:', records.length);
    res.json(records);
  } catch (err) {
    console.error('Error in listBySubadmin:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
  }
};
