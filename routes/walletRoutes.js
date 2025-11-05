const express = require('express');
const Razorpay = require('razorpay');
const { authMiddleware } = require('../middleware/authMiddleware');
const { Wallet, WalletLedger, Txn } = require('../models');
const { enqueueAutoRecharge } = require('../workers/rechargeWorker');

const router = express.Router();

// Razorpay client (used to verify payment in absence of webhook)
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /wallet - return current user's wallet balance
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const [wallet] = await Wallet.findOrCreate({ where: { user_id: userId }, defaults: { balance: 0 } });
    res.json({ balance: wallet.balance, updatedAt: wallet.updated_at });
  } catch (err) {
    console.error('wallet get error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /wallet/ledger - recent entries
router.get('/ledger', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const items = await WalletLedger.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 50 });
    res.json({ ledger: items });
  } catch (err) {
    console.error('wallet ledger error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Optional confirm endpoint (UX convenience) - does not replace PG webhook
router.post('/confirm-payment', authMiddleware, async (req, res) => {
  try {
    const { localTxnId, orderId } = req.body || {};
    const userId = req.admin.id;

    let txn = null;
    if (localTxnId) {
      txn = await Txn.findOne({ where: { local_txn_id: localTxnId, user_id: userId } });
    } else if (orderId) {
      txn = await Txn.findOne({ where: { payment_order_id: orderId, user_id: userId } });
    }
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    // If already PAID, trigger auto-recharge and return
    if (txn.status === 'PAID') {
      enqueueAutoRecharge(txn.local_txn_id);
      return res.json({ ok: true, status: txn.status });
    }

    // If webhook is not configured or delayed, verify order with Razorpay directly
    if (!orderId && txn.payment_order_id) {
      // prefer stored order id if not supplied by client
      const order = await rzp.orders.fetch(txn.payment_order_id);
      if (order && order.status === 'paid') {
        // Fetch payments for additional details
        const payments = await rzp.orders.fetchPayments(order.id).catch(() => ({ items: [] }));
        const pay = Array.isArray(payments?.items) && payments.items.length ? payments.items[0] : null;

        txn.status = 'PAID';
        txn.payment_id = pay?.id || null;
        txn.payment_method = pay?.method || 'unknown';
        txn.payment_raw = { order, payments };
        txn.updated_at = new Date();
        await txn.save();

        enqueueAutoRecharge(txn.local_txn_id);
        return res.json({ ok: true, status: txn.status });
      }
      return res.status(202).json({ ok: true, status: order?.status || txn.status });
    }

    if (orderId) {
      const order = await rzp.orders.fetch(orderId);
      if (order && order.status === 'paid') {
        const payments = await rzp.orders.fetchPayments(order.id).catch(() => ({ items: [] }));
        const pay = Array.isArray(payments?.items) && payments.items.length ? payments.items[0] : null;

        txn.status = 'PAID';
        txn.payment_id = pay?.id || null;
        txn.payment_method = pay?.method || 'unknown';
        txn.payment_raw = { order, payments };
        txn.updated_at = new Date();
        await txn.save();

        enqueueAutoRecharge(txn.local_txn_id);
        return res.json({ ok: true, status: txn.status });
      }
      return res.status(202).json({ ok: true, status: order?.status || txn.status });
    }

    return res.status(202).json({ ok: true, status: txn.status });
  } catch (err) {
    console.error('confirm-payment error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
