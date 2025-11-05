const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DriverSalary extends Model {}

  DriverSalary.init(
    {
      subAdminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      baseSalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currentBalance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      effectiveFrom: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      salaryType: {
        type: DataTypes.ENUM('fixed', 'per-trip'),
        allowNull: false,
        defaultValue: 'fixed',
      },
      perTripRate: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'DriverSalary',
      tableName: 'driver_salary',
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ['subAdminId'] },
        { fields: ['driverId'] },
      ],
    }
  );

  return DriverSalary;
};
