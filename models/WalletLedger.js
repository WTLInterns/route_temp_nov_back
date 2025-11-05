const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WalletLedger = sequelize.define('WalletLedger', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    local_txn_id: { type: DataTypes.STRING, allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // e.g., RECHARGE_REFUND
    amount: { type: DataTypes.DECIMAL(14,2), allowNull: false },
    balance_after: { type: DataTypes.DECIMAL(14,2), allowNull: false },
    meta: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'wallet_ledger',
    underscored: true,
    timestamps: false,
  });

  return WalletLedger;
};
