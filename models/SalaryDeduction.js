const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SalaryDeduction extends Model {}

  SalaryDeduction.init(
    {
      subAdminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'SalaryDeduction',
      tableName: 'salary_deductions',
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ['subAdminId'] },
        { fields: ['driverId'] },
        { fields: ['date'] },
      ],
    }
  );

  return SalaryDeduction;
};
