// models/DriverCashAdjustment.js

module.exports = (sequelize, DataTypes) => {
  const DriverCashAdjustment = sequelize.define(
    "DriverCashAdjustment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "drivers",
          key: "id",
        },
      },
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "admins",
          key: "id",
        },
      },
      amount: {
        // Positive = driver handed cash to admin (reduces cash-on-hand)
        // Negative = admin gave cash to driver (increases cash-on-hand)
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      note: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "DriverCashAdjustments",
      timestamps: true,
    },
  )

  return DriverCashAdjustment
}
