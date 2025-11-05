const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cab_id: { type: DataTypes.INTEGER, allowNull: true },
    cab_number: { type: DataTypes.STRING, allowNull: false },
    tag_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    owner_user_id: { type: DataTypes.INTEGER, allowNull: false },
    balance_cached: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'tags',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['owner_user_id', 'tag_number'] },
    ],
  });

  return Tag;
};
