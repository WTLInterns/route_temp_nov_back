'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('driver_salary', 'salaryType', {
      type: Sequelize.ENUM('fixed', 'per-trip'),
      allowNull: false,
      defaultValue: 'fixed',
      after: 'effectiveFrom'
    });
    
    await queryInterface.addColumn('driver_salary', 'perTripRate', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      after: 'salaryType'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('driver_salary', 'perTripRate');
    await queryInterface.removeColumn('driver_salary', 'salaryType');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_driver_salary_salaryType";');
  }
};
