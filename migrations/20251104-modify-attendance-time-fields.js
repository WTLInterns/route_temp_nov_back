'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change punchIn and punchOut from DATE to STRING (TIME format HH:mm)
    await queryInterface.changeColumn('attendance', 'punchIn', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Time in HH:mm format'
    });
    
    await queryInterface.changeColumn('attendance', 'punchOut', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Time in HH:mm format'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to DATE type
    await queryInterface.changeColumn('attendance', 'punchIn', {
      type: Sequelize.DATE,
      allowNull: false
    });
    
    await queryInterface.changeColumn('attendance', 'punchOut', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
