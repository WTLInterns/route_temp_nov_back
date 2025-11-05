const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Attendance extends Model {}

  Attendance.init(
    {
      subAdminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      punchIn: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Time in HH:mm format'
      },
      punchOut: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Time in HH:mm format'
      },
      notes: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.ENUM('Present', 'Absent', 'Half-Day'),
        allowNull: false,
        defaultValue: 'Present',
      },
    },
    {
      sequelize,
      modelName: 'Attendance',
      tableName: 'attendance',
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ['subAdminId'] },
        { fields: ['driverId'] },
        { fields: ['date'] },
      ],
    }
  );

  return Attendance;
};
