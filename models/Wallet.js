const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wallet = sequelize.define('Wallet', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    balance: { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'wallets',
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ['user_id'] },
    ],
  });

  return Wallet;
};
