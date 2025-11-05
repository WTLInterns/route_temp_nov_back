'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // tags
    await queryInterface.createTable('tags', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cab_id: { type: Sequelize.INTEGER, allowNull: true },
      cab_number: { type: Sequelize.STRING, allowNull: false },
      tag_number: { type: Sequelize.STRING, allowNull: false, unique: true },
      owner_user_id: { type: Sequelize.INTEGER, allowNull: false },
      balance_cached: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('tags', ['owner_user_id', 'tag_number']);

    // wallets
    await queryInterface.createTable('wallets', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      balance: { type: Sequelize.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // wallet_ledger
    await queryInterface.createTable('wallet_ledger', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      local_txn_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      balance_after: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      meta: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // txns
    await queryInterface.createTable('txns', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      local_txn_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      initiated_by: { type: Sequelize.INTEGER, allowNull: true },
      tag_number: { type: Sequelize.STRING, allowNull: false },
      cab_id: { type: Sequelize.INTEGER, allowNull: true },
      cab_number: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      payment_order_id: { type: Sequelize.STRING, allowNull: true },
      payment_id: { type: Sequelize.STRING, allowNull: true },
      payment_method: { type: Sequelize.STRING, allowNull: true },
      payment_meta: { type: Sequelize.JSONB, allowNull: true },
      payment_raw: { type: Sequelize.JSONB, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'PENDING' },
      provider_txn_id: { type: Sequelize.STRING, allowNull: true },
      provider_status: { type: Sequelize.STRING, allowNull: true },
      provider_raw: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('txns', ['user_id']);
    await queryInterface.addIndex('txns', ['tag_number']);
    await queryInterface.addIndex('txns', ['status']);

    // recharge_audit
    await queryInterface.createTable('recharge_audit', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      local_txn_id: { type: Sequelize.STRING, allowNull: false },
      owner_user_id: { type: Sequelize.INTEGER, allowNull: false },
      initiated_by: { type: Sequelize.INTEGER, allowNull: true },
      tag_number: { type: Sequelize.STRING, allowNull: false },
      cab_id: { type: Sequelize.INTEGER, allowNull: true },
      cab_number: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      result: { type: Sequelize.STRING, allowNull: false },
      provider_raw: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // provider_balance
    await queryInterface.createTable('provider_balance', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      provider_name: { type: Sequelize.STRING, allowNull: false, unique: true },
      balance: { type: Sequelize.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('provider_balance');
    await queryInterface.dropTable('recharge_audit');
    await queryInterface.dropTable('txns');
    await queryInterface.dropTable('wallet_ledger');
    await queryInterface.dropTable('wallets');
    await queryInterface.dropTable('tags');
  }
};
