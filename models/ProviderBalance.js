const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProviderBalance = sequelize.define('ProviderBalance', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    provider_name: { type: DataTypes.STRING, allowNull: false, unique: true },
    balance: { type: DataTypes.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'provider_balance',
    underscored: true,
    timestamps: false,
  });

  return ProviderBalance;
};
