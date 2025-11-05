const { Txn, ProviderBalance, RechargeAudit, Wallet, WalletLedger, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');
const providerAdapter = require('../utils/providerAdapter');

const processing = new Set();

function enqueueAutoRecharge(localTxnId) {
  // simple in-process queue
  if (!localTxnId) return;
  if (processing.has(localTxnId)) return;
  processing.add(localTxnId);
  setImmediate(async () => {
    try {
      await performAutoRecharge(localTxnId);
    } catch (e) {
      console.error('performAutoRecharge error', e);
    } finally {
      processing.delete(localTxnId);
    }
  });
}

async function cancelStalePendingTxns() {
  try {
    const ttlHours = Number(process.env.FASTAG_TXN_TTL_HOURS || 48);
    const cutoff = new Date(Date.now() - ttlHours * 3600 * 1000);
    await Txn.update(
      { status: 'CANCELLED', updated_at: new Date() },
      { where: { status: 'PENDING', created_at: { [Op.lt]: cutoff } } }
    );
  } catch (e) {
    console.error('cancelStalePendingTxns error', e);
  }
}

function startSchedulers() {
  // run every 10 minutes
  setInterval(cancelStalePendingTxns, 10 * 60 * 1000);
}

async function performAutoRecharge(local_txn_id) {
  // Idempotency and locking
  const t = await sequelize.transaction();
  try {
    const txn = await Txn.findOne({ where: { local_txn_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!txn) { await t.commit(); return; }

    if (['PROCESSING', 'COMPLETED', 'FAILED'].includes(txn.status)) {
      await t.commit();
      return;
    }

    if (txn.status !== 'PAID') {
      await t.commit();
      return; // wait for payment
    }

    // mark processing
    txn.status = 'PROCESSING';
    txn.updated_at = new Date();
    await txn.save({ transaction: t });

    // Reserve provider funds
    const providerName = providerAdapter.PROVIDER_NAME || 'CYRUS';
    const pb = await ProviderBalance.findOne({ where: { provider_name: providerName }, transaction: t, lock: t.LOCK.UPDATE });
    if (!pb || Number(pb.balance) < Number(txn.amount)) {
      txn.status = 'PENDING_PROVIDER_FUNDS';
      await txn.save({ transaction: t });

      await RechargeAudit.create({
        local_txn_id: txn.local_txn_id,
        owner_user_id: txn.user_id,
        initiated_by: txn.initiated_by,
        tag_number: txn.tag_number,
        cab_id: txn.cab_id,
        cab_number: txn.cab_number,
        amount: txn.amount,
        result: 'PENDING_PROVIDER_FUNDS',
        provider_raw: null,
      }, { transaction: t });

      await t.commit();
      // TODO: notify ops
      return;
    }

    // decrement (reserve)
    pb.balance = Number(pb.balance) - Number(txn.amount);
    pb.updated_at = new Date();
    await pb.save({ transaction: t });

    await t.commit();

    // Call provider outside of reservation transaction
    let providerResp;
    try {
      providerResp = await providerAdapter.rechargeTag({
        tag_number: txn.tag_number,
        amount: Number(txn.amount),
        merchant_txn_id: txn.local_txn_id,
      });
    } catch (err) {
      // rollback reservation and refund
      await reverseReservationAndFail(txn, providerName, err);
      return;
    }

    // Success flow
    const t2 = await sequelize.transaction();
    try {
      const txn2 = await Txn.findOne({ where: { local_txn_id: txn.local_txn_id }, transaction: t2, lock: t2.LOCK.UPDATE });
      if (!txn2) { await t2.rollback(); return; }

      txn2.provider_txn_id = providerResp.transaction_id || txn2.provider_txn_id;
      txn2.provider_status = providerResp.status || 'SUCCESS';
      txn2.provider_raw = providerResp.raw || providerResp;
      txn2.status = 'COMPLETED';
      txn2.updated_at = new Date();
      await txn2.save({ transaction: t2 });

      // optionally update tag balance
      if (providerResp.raw && providerResp.raw.balance != null) {
        const tag = await Tag.findOne({ where: { tag_number: txn2.tag_number }, transaction: t2, lock: t2.LOCK.UPDATE });
        if (tag) {
          tag.balance_cached = Number(providerResp.raw.balance);
          await tag.save({ transaction: t2 });
        }
      }

      await RechargeAudit.create({
        local_txn_id: txn2.local_txn_id,
        owner_user_id: txn2.user_id,
        initiated_by: txn2.initiated_by,
        tag_number: txn2.tag_number,
        cab_id: txn2.cab_id,
        cab_number: txn2.cab_number,
        amount: txn2.amount,
        result: 'COMPLETED',
        provider_raw: providerResp.raw || providerResp,
      }, { transaction: t2 });

      await t2.commit();
    } catch (e) {
      await t2.rollback();
      // If commit fails, consider retry or mark for reconciliation
      throw e;
    }
  } catch (e) {
    try { await t.rollback(); } catch {}
    throw e;
  }
}

async function reverseReservationAndFail(txn, providerName, providerError) {
  const t = await sequelize.transaction();
  try {
    const pb = await ProviderBalance.findOne({ where: { provider_name: providerName }, transaction: t, lock: t.LOCK.UPDATE });
    if (pb) {
      pb.balance = Number(pb.balance) + Number(txn.amount);
      pb.updated_at = new Date();
      await pb.save({ transaction: t });
    }

    const txn2 = await Txn.findOne({ where: { local_txn_id: txn.local_txn_id }, transaction: t, lock: t.LOCK.UPDATE });
    if (txn2) {
      txn2.status = 'FAILED';
      txn2.provider_status = 'FAILED';
      txn2.provider_raw = { error: providerError?.message || String(providerError) };
      txn2.updated_at = new Date();
      await txn2.save({ transaction: t });
    }

    // Idempotent wallet refund
    const existing = await WalletLedger.findOne({ where: { local_txn_id: txn.local_txn_id }, transaction: t, lock: t.LOCK.KEY_SHARE });
    if (!existing) {
      const [wallet] = await Wallet.findOrCreate({ where: { user_id: txn.user_id }, defaults: { balance: 0 }, transaction: t, lock: t.LOCK.UPDATE });
      const newBal = Number(wallet.balance) + Number(txn.amount);
      wallet.balance = newBal;
      wallet.updated_at = new Date();
      await wallet.save({ transaction: t });

      await WalletLedger.create({
        local_txn_id: txn.local_txn_id,
        user_id: txn.user_id,
        type: 'RECHARGE_REFUND',
        amount: txn.amount,
        balance_after: newBal,
        meta: { reason: 'PROVIDER_FAILED' },
      }, { transaction: t });
    }

    await RechargeAudit.create({
      local_txn_id: txn.local_txn_id,
      owner_user_id: txn.user_id,
      initiated_by: txn.initiated_by,
      tag_number: txn.tag_number,
      cab_id: txn.cab_id,
      cab_number: txn.cab_number,
      amount: txn.amount,
      result: 'FAILED',
      provider_raw: { error: providerError?.message || String(providerError) },
    }, { transaction: t });

    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  enqueueAutoRecharge,
  performAutoRecharge,
  startSchedulers,
};
