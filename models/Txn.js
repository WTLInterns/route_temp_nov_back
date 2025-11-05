const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Txn = sequelize.define('Txn', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    local_txn_id: { type: DataTypes.STRING, allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    initiated_by: { type: DataTypes.INTEGER, allowNull: true },
    tag_number: { type: DataTypes.STRING, allowNull: false },
    cab_id: { type: DataTypes.INTEGER, allowNull: true },
    cab_number: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(14,2), allowNull: false },
    payment_order_id: { type: DataTypes.STRING, allowNull: true },
    payment_id: { type: DataTypes.STRING, allowNull: true },
    payment_method: { type: DataTypes.STRING, allowNull: true },
    payment_meta: { type: DataTypes.JSONB, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PENDING' },
    provider_txn_id: { type: DataTypes.STRING, allowNull: true },
    provider_status: { type: DataTypes.STRING, allowNull: true },
    provider_raw: { type: DataTypes.JSONB, allowNull: true },
    payment_raw: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'txns',
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ['local_txn_id'] },
      { fields: ['user_id'] },
      { fields: ['tag_number'] },
      { fields: ['status'] },
    ],
  });

  return Txn;
};
