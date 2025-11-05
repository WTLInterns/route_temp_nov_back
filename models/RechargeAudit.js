const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RechargeAudit = sequelize.define('RechargeAudit', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    local_txn_id: { type: DataTypes.STRING, allowNull: false },
    owner_user_id: { type: DataTypes.INTEGER, allowNull: false },
    initiated_by: { type: DataTypes.INTEGER, allowNull: true },
    tag_number: { type: DataTypes.STRING, allowNull: false },
    cab_id: { type: DataTypes.INTEGER, allowNull: true },
    cab_number: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(14,2), allowNull: false },
    result: { type: DataTypes.STRING, allowNull: false }, // COMPLETED | FAILED | PENDING_PROVIDER_FUNDS
    provider_raw: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'recharge_audit',
    underscored: true,
    timestamps: false,
  });

  return RechargeAudit;
};
