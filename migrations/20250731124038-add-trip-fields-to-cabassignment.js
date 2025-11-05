// migrations/xxxx-add-trip-fields-to-cabassignment.js

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('CabAssignments', 'customerName', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unknown', // ✅ fallback for old records
    });

    await queryInterface.addColumn('CabAssignments', 'customerPhone', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '0000000000',
    });

    await queryInterface.addColumn('CabAssignments', 'pickupLocation', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Not Specified',
    });

    await queryInterface.addColumn('CabAssignments', 'dropLocation', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Not Specified',
    });

    await queryInterface.addColumn('CabAssignments', 'tripType', {
      type: Sequelize.ENUM('One Way', 'Round Trip', 'Hourly', 'Daily'),
      allowNull: false,
      defaultValue: 'One Way',
    });

    await queryInterface.addColumn('CabAssignments', 'vehicleType', {
      type: Sequelize.ENUM('Sedan', 'SUV', 'Hatchback', 'Luxury'),
      allowNull: false,
      defaultValue: 'Sedan',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('CabAssignments', 'customerName');
    await queryInterface.removeColumn('CabAssignments', 'customerPhone');
    await queryInterface.removeColumn('CabAssignments', 'pickupLocation');
    await queryInterface.removeColumn('CabAssignments', 'dropLocation');
    await queryInterface.removeColumn('CabAssignments', 'tripType');
    await queryInterface.removeColumn('CabAssignments', 'vehicleType');
  }
};
