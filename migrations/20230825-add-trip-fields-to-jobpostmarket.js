'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('JobPostMarket', 'tripType', {
      type: Sequelize.ENUM('one-way', 'round-trip', 'rental-trip'),
      allowNull: false,
    });

    //  Common field
    await queryInterface.addColumn('JobPostMarket', 'distance', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    //  Round Trip fields
    await queryInterface.addColumn('JobPostMarket', 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'startTime', {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'endDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'endTime', {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'noOfDays', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    //  Rental Trip fields
    await queryInterface.addColumn('JobPostMarket', 'rentalHours', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'fixedKM', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'extraHours', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('JobPostMarket', 'extraDistance', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // =% Rollback
    await queryInterface.changeColumn('JobPostMarket', 'tripType', {
      type: Sequelize.ENUM('one-way', 'round-trip'),
      allowNull: false,
    });

    await queryInterface.removeColumn('JobPostMarket', 'distance');

    await queryInterface.removeColumn('JobPostMarket', 'startDate');
    await queryInterface.removeColumn('JobPostMarket', 'startTime');
    await queryInterface.removeColumn('JobPostMarket', 'endDate');
    await queryInterface.removeColumn('JobPostMarket', 'endTime');
    await queryInterface.removeColumn('JobPostMarket', 'noOfDays');

    await queryInterface.removeColumn('JobPostMarket', 'rentalHours');
    await queryInterface.removeColumn('JobPostMarket', 'fixedKM');
    await queryInterface.removeColumn('JobPostMarket', 'extraHours');
    await queryInterface.removeColumn('JobPostMarket', 'extraDistance');
  }
};
