'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('attendance', 'status', {
      type: Sequelize.ENUM('Present', 'Absent', 'Half-Day'),
      allowNull: false,
      defaultValue: 'Present',
      after: 'notes'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('attendance', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_attendance_status";');
  }
};
