'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Note: ARRAY is Postgres-only. Ensure your DB dialect supports it.
    await queryInterface.addColumn('CabAssignments', 'optionalPickupLocations', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.addColumn('CabAssignments', 'optionalDropLocations', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('CabAssignments', 'optionalPickupLocations');
    await queryInterface.removeColumn('CabAssignments', 'optionalDropLocations');
  }
};
