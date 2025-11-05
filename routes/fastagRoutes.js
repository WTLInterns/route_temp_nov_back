const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { URLSearchParams } = require('url');
const { authMiddleware } = require('../middleware/authMiddleware');
const { Tag, Txn, ProviderBalance, RechargeAudit, Wallet, WalletLedger, CabsDetails } = require('../models');
const { enqueueAutoRecharge } = require('../workers/rechargeWorker');
const providerAdapter = require('../utils/providerAdapter');

const router = express.Router();

// Razorpay instance for FASTag flow (trim env values to avoid whitespace issues)
const RZP_KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const RZP_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const rzp = new Razorpay({
  key_id: RZP_KEY_ID,
  key_secret: RZP_KEY_SECRET,
});

// Direct UPI config (no PG)
const UPI_VPA = (process.env.UPI_PAYEE_VPA || '').trim();
const UPI_PN = (process.env.UPI_PAYEE_NAME || 'FASTag Recharge').trim();
async function resolveUserTag(userId, { tagNumber, cabId, cabNumber }) {
  let tag = null;
  if (tagNumber) {
    tag = await Tag.findOne({ where: { tag_number: tagNumber, owner_user_id: userId } });
    if (tag) return tag;
  }
  if (!tag && cabId) {
    tag = await Tag.findOne({ where: { owner_user_id: userId, cab_id: cabId } });
    if (tag) return tag;
  }
  if (!tag && cabNumber) {
    tag = await Tag.findOne({ where: { owner_user_id: userId, cab_number: cabNumber } });
  }
  return tag;
}

// POST /fastag/initiate-recharge
router.post('/initiate-recharge', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id; // server-side auth
    const { tagNumber, cabId, cabNumber, amount } = req.body || {};

    if (amount === undefined || amount === null) return res.status(400).json({ error: 'Missing amount' });
    const amtNumber = Number(amount);
    if (!Number.isFinite(amtNumber) || amtNumber <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Provide a positive number (in INR).' });
    }

    const tag = await resolveUserTag(userId, { tagNumber, cabId, cabNumber });
    if (!tag) return res.status(403).json({ error: 'Forbidden: FASTag not linked to this cab/user' });

    const localTxnId = `FT_${uuidv4()}`;

    // Persist PENDING txn
    const txn = await Txn.create({
      local_txn_id: localTxnId,
      user_id: userId,
      initiated_by: userId,
      tag_number: tag.tag_number,
      cab_id: cabId || tag.cab_id || null,
      cab_number: tag.cab_number || cabNumber || null,
      amount: amtNumber,
      status: 'PENDING',
      payment_meta: { tagNumber: tag.tag_number, cabId: cabId || tag.cab_id, cabNumber: tag.cab_number || cabNumber || null, localTxnId },
    });

    // Create Razorpay order (INR paise)
    if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET).' });
    }
    let order;
    try {
      order = await rzp.orders.create({
        amount: Math.round(amtNumber * 100),
        currency: 'INR',
        // Razorpay requires receipt length <= 40
        receipt: localTxnId,
        notes: {
          tagNumber: tag.tag_number,
          cabId: String(cabId || tag.cab_id || ''),
          cabNumber: tag.cab_number || cabNumber || '',
          localTxnId,
        },
        payment_capture: 1,
      });
    } catch (e) {
      // Provide richer diagnostics when network fails or keys invalid
      console.error('razorpay order create error', e);
      const code = e?.code || e?.statusCode || e?.response?.status || 'UNKNOWN';
      return res.status(502).json({ error: `Failed to create Razorpay order. Verify keys/network. code=${code}` });
    }

    // save order id
    txn.payment_order_id = order.id;
    await txn.save();

    // qrPayload for client rendering (Checkout/UPI)
    const qrPayload = {
      gateway: 'razorpay',
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      keyId: RZP_KEY_ID,
      tagNumber: tag.tag_number,
      cabNumber: tag.cab_number || null,
    };

    const ttlHours = Number(process.env.FASTAG_TXN_TTL_HOURS || 48);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

    return res.json({ localTxnId, paymentOrder: order, qrPayload, expiresAt });
  } catch (err) {
    console.error('initiate-recharge error', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// POST /fastag/initiate-upi — create direct UPI deeplink + QR (no PG)
router.post('/initiate-upi', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const { tagNumber, cabId, cabNumber, amount } = req.body || {};

    if (amount === undefined || amount === null) return res.status(400).json({ error: 'Missing amount' });
    const amtNumber = Number(amount);
    if (!Number.isFinite(amtNumber) || amtNumber <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Provide a positive number (in INR).' });
    }

    const tag = await resolveUserTag(userId, { tagNumber, cabId, cabNumber });
    if (!tag) return res.status(403).json({ error: 'Forbidden: FASTag not linked to this cab/user' });

    if (!UPI_VPA) {
      return res.status(500).json({ error: 'Direct UPI not configured (missing UPI_PAYEE_VPA).' });
    }

    const localTxnId = `FT_${uuidv4()}`;

    await Txn.create({
      local_txn_id: localTxnId,
      user_id: userId,
      initiated_by: userId,
      tag_number: tag.tag_number,
      cab_id: cabId || tag.cab_id || null,
      cab_number: tag.cab_number || cabNumber || null,
      amount: amtNumber,
      status: 'PENDING',
      payment_meta: { mode: 'UPI_DIRECT', tagNumber: tag.tag_number, cabId: cabId || tag.cab_id || null, cabNumber: tag.cab_number || cabNumber || null, localTxnId },
    });

    const params = new URLSearchParams();
    params.set('pa', UPI_VPA);
    params.set('pn', UPI_PN);
    params.set('am', String(amtNumber));
    params.set('cu', 'INR');
    // Include localTxnId in the UPI note so it appears in bank statements/CSV for reconciliation
    params.set('tn', `FASTag ${tag.tag_number} ${localTxnId}`);
    params.set('tr', localTxnId);
    const upiLink = `upi://pay?${params.toString()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

    const ttlHours = Number(process.env.FASTAG_TXN_TTL_HOURS || 48);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

    return res.json({ localTxnId, amount: amtNumber, upi: { vpa: UPI_VPA, pn: UPI_PN, upiLink, qrUrl, tagNumber: tag.tag_number, cabNumber: tag.cab_number || null }, expiresAt });
  } catch (err) {
    console.error('initiate-upi error', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

// Razorpay webhook - use raw body parser for signature verification on this route only
const rawJson = express.raw({ type: 'application/json' });
router.post('/razorpay-webhook', rawJson, async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Webhook is optional in dev; if secret is not configured, ignore events gracefully.
      console.warn('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set. Ignoring.');
      return res.status(200).send('webhook disabled');
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // Buffer
    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (signature !== expected) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(body.toString());
    const event = payload?.event;
    const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity;

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = entity?.order_id || entity?.id;
      if (!orderId) return res.status(200).send('ok');

      const txn = await Txn.findOne({ where: { payment_order_id: orderId } });
      if (!txn) return res.status(200).send('ok');

      if (txn.status !== 'PAID') {
        txn.status = 'PAID';
        txn.payment_id = entity?.id || null;
        txn.payment_method = entity?.method || 'unknown';
        txn.payment_raw = payload;
        txn.updated_at = new Date();
        await txn.save();

        // Enqueue async auto recharge
        enqueueAutoRecharge(txn.local_txn_id).catch((e) => console.error('enqueueAutoRecharge error', e));
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('razorpay-webhook error', err);
    return res.status(200).send('ok');
  }
});

// Provider webhook (Cyrus)
router.post('/provider-webhook', rawJson, async (req, res) => {
  try {
    // verify provider signature
    const valid = providerAdapter.verifyWebhook({
      headers: req.headers,
      body: JSON.parse(req.body.toString()),
      rawBody: req.body,
    });
    if (!valid) return res.status(400).send('Invalid signature');

    const data = JSON.parse(req.body.toString());
    const localTxnId = data?.merchantTxnId || data?.merchant_txn_id;
    if (!localTxnId) return res.status(200).send('ok');

    const txn = await Txn.findOne({ where: { local_txn_id: localTxnId } });
    if (!txn) return res.status(200).send('ok');

    // Idempotent update
    txn.provider_txn_id = data?.transactionId || data?.txnId || txn.provider_txn_id;
    txn.provider_status = data?.status || txn.provider_status;
    txn.provider_raw = data;

    if (data?.status === 'SUCCESS') {
      txn.status = 'COMPLETED';
    } else if (data?.status === 'FAILED') {
      if (txn.status !== 'FAILED' && txn.status !== 'COMPLETED') {
        // trigger refund if not refunded yet
        await refundToWalletIfNeeded(txn);
      }
      txn.status = 'FAILED';
    }
    txn.updated_at = new Date();
    await txn.save();

    // audit
    await RechargeAudit.create({
      local_txn_id: txn.local_txn_id,
      owner_user_id: txn.user_id,
      initiated_by: txn.initiated_by,
      tag_number: txn.tag_number,
      cab_id: txn.cab_id,
      cab_number: txn.cab_number,
      amount: txn.amount,
      result: txn.status,
      provider_raw: data,
    });

    return res.status(200).send('ok');
  } catch (err) {
    console.error('provider-webhook error', err);
    return res.status(200).send('ok');
  }
});

// UPI CREDIT webhook (from bank/PSP/aggregator) — verifies payment and auto-marks PAID
// Expects HMAC SHA256 over raw body using env UPI_WEBHOOK_SECRET in header x-upi-signature (or x-signature)
router.post('/upi-webhook', rawJson, async (req, res) => {
  try {
    const secret = process.env.UPI_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('UPI webhook received but UPI_WEBHOOK_SECRET not set. Ignoring.');
      return res.status(200).send('webhook disabled');
    }

    const signature = req.headers['x-upi-signature'] || req.headers['x-signature'] || '';
    const body = req.body; // Buffer
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (!signature || signature !== expected) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(body.toString());
    // Try to derive localTxnId from multiple potential fields
    const refRaw = payload?.tr || payload?.reference || payload?.merchantTxnId || payload?.note || payload?.narration || '';
    const m = String(refRaw || '').match(/FT_[A-Za-z0-9-]+/);
    const localTxnId = m ? m[0] : (refRaw || '');
    if (!localTxnId) return res.status(200).send('ok');

    const amount = Number(payload?.amount ?? payload?.am ?? payload?.amt ?? 0);
    const payeeVpa = (payload?.payeeVpa ?? payload?.pa ?? payload?.vpa ?? '').trim();
    const status = (payload?.status || payload?.event || '').toString().toUpperCase();
    const utr = payload?.utr || payload?.rrn || payload?.transactionId || payload?.txnId || null;

    const txn = await Txn.findOne({ where: { local_txn_id: localTxnId } });
    if (!txn) return res.status(200).send('ok');

    // Idempotent guards
    if (['PAID', 'PROCESSING', 'COMPLETED'].includes(txn.status)) {
      return res.status(200).send('ok');
    }

    // Only act on successful credit
    const isSuccess = ['SUCCESS', 'COMPLETED', 'CREDIT', 'CREDITED', 'OK'].includes(status) || payload?.success === true;
    if (!isSuccess) return res.status(200).send('ok');

    // Validate amount must exactly match the initiated amount
    if (!Number.isFinite(amount) || Number(amount) !== Number(txn.amount)) {
      console.warn(`UPI webhook amount mismatch for ${localTxnId}: received=${amount}, expected=${txn.amount}`);
      return res.status(200).send('ok');
    }

    // Validate credited to our VPA if provided
    if (payeeVpa && UPI_VPA && payeeVpa.toLowerCase() !== UPI_VPA.toLowerCase()) {
      console.warn(`UPI webhook VPA mismatch for ${localTxnId}: got=${payeeVpa}, expected=${UPI_VPA}`);
      return res.status(200).send('ok');
    }

    // Mark PAID and enqueue auto recharge
    txn.status = 'PAID';
    txn.payment_id = utr || txn.payment_id || null;
    txn.payment_method = 'UPI_DIRECT';
    txn.payment_raw = payload;
    txn.updated_at = new Date();
    await txn.save();

    enqueueAutoRecharge(txn.local_txn_id).catch((e) => console.error('enqueueAutoRecharge error', e));

    return res.status(200).send('ok');
  } catch (err) {
    console.error('upi-webhook error', err);
    return res.status(200).send('ok');
  }
});

async function refundToWalletIfNeeded(txn) {
  // simple idempotent refund: if ledger exists for local_txn_id, skip
  const existing = await WalletLedger.findOne({ where: { local_txn_id: txn.local_txn_id } });
  if (existing) return;

  // credit wallet
  const t = await Txn.sequelize.transaction();
  try {
    const [wallet] = await Wallet.findOrCreate({ where: { user_id: txn.user_id }, defaults: { balance: 0 } , transaction: t, lock: t.LOCK.UPDATE});
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

    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

// GET /fastag/tags
router.get('/tags', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const tags = await Tag.findAll({ where: { owner_user_id: userId } });
    res.json({ tags });
  } catch (err) {
    console.error('get tags error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /fastag/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const txns = await Txn.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 100 });
    res.json({ txns });
  } catch (err) {
    console.error('get txns error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /fastag/txn/:localTxnId
router.get('/txn/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const id = req.params.id;
    const txn = await Txn.findOne({ where: { local_txn_id: id, user_id: userId } });
    if (!txn) return res.status(404).json({ error: 'Not found' });
    res.json({ txn });
  } catch (err) {
    console.error('get txn error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /fastag/mark-paid — manual confirmation to proceed with recharge (used for direct UPI)
router.post('/mark-paid', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const { localTxnId } = req.body || {};
    if (!localTxnId) return res.status(400).json({ error: 'localTxnId required' });

    const txn = await Txn.findOne({ where: { local_txn_id: localTxnId, user_id: userId } });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    if (['PROCESSING', 'COMPLETED'].includes(txn.status)) {
      return res.json({ ok: true, status: txn.status });
    }

    txn.status = 'PAID';
    txn.updated_at = new Date();
    await txn.save();

    enqueueAutoRecharge(txn.local_txn_id).catch((e) => console.error('enqueueAutoRecharge error', e));

    return res.json({ ok: true, status: txn.status });
  } catch (err) {
    console.error('mark-paid error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /fastag/link-tag — link or update a FASTag tag to a cab for the authenticated subadmin
router.post('/link-tag', authMiddleware, async (req, res) => {
  try {
    const userId = req.admin.id;
    const { tagNumber, cabId, cabNumber } = req.body || {};

    if (!tagNumber || (!cabId && !cabNumber)) {
      return res.status(400).json({ error: 'tagNumber and cabId/cabNumber are required' });
    }

    // Verify cab belongs to this subadmin
    let cab = null;
    if (cabId) {
      cab = await CabsDetails.findOne({ where: { id: cabId, addedBy: userId } });
    } else if (cabNumber) {
      cab = await CabsDetails.findOne({ where: { cabNumber: cabNumber, addedBy: userId } });
    }
    if (!cab) return res.status(403).json({ error: 'Cab not found for this user' });

    // Ensure tag_number not owned by someone else
    const existingByTag = await Tag.findOne({ where: { tag_number: tagNumber } });
    if (existingByTag && existingByTag.owner_user_id !== userId) {
      return res.status(409).json({ error: 'Tag number already linked to another account' });
    }

    let tag = await Tag.findOne({ where: { owner_user_id: userId, tag_number: tagNumber } });
    if (!tag) {
      // create
      tag = await Tag.create({
        owner_user_id: userId,
        tag_number: tagNumber,
        cab_id: cab.id,
        cab_number: cab.cabNumber,
        balance_cached: 0,
        status: 'Active',
      });
    } else {
      // update mapping
      tag.cab_id = cab.id;
      tag.cab_number = cab.cabNumber;
      await tag.save();
    }

    return res.json({ ok: true, tag });
  } catch (err) {
    console.error('link-tag error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
