const { Txn } = require('../models');
const { Op } = require('sequelize');
const { checkPaymentByReference } = require('../utils/upiStatusAdapter');
const { enqueueAutoRecharge } = require('./rechargeWorker');

let timer = null;
let warnedUnsupported = false;

async function runUPIPollCycle() {
  try {
    const lookbackMin = Number(process.env.UPI_POLL_LOOKBACK_MINUTES || 120);
    const maxBatch = Number(process.env.UPI_POLL_BATCH_SIZE || 25);
    const now = Date.now();
    const since = new Date(now - lookbackMin * 60 * 1000);
    const perTxnThrottleMs = Number(process.env.UPI_POLL_PER_TXN_THROTTLE_MS || 8000);
    const maxAttempts = Number(process.env.UPI_POLL_MAX_ATTEMPTS || 60);
    const expectedVpa = (process.env.UPI_PAYEE_VPA || '').trim().toLowerCase();

    // Find pending UPI_DIRECT txns in lookback window
    const candidates = await Txn.findAll({
      where: {
        status: 'PENDING',
        created_at: { [Op.gte]: since },
      },
      order: [['created_at', 'ASC']],
      limit: maxBatch,
    });

    for (const txn of candidates) {
      const pm = txn.payment_meta || {};
      if (pm && pm.mode && pm.mode !== 'UPI_DIRECT') continue;

      const attempts = Number(pm.upiPollAttempts || 0);
      if (attempts >= maxAttempts) continue;

      const lastAt = pm.upiPollLastAt ? new Date(pm.upiPollLastAt).getTime() : 0;
      if (lastAt && now - lastAt < perTxnThrottleMs) continue;

      // Mark attempt and time (persist regardless of outcome to throttle)
      pm.upiPollAttempts = attempts + 1;
      pm.upiPollLastAt = new Date().toISOString();
      txn.payment_meta = pm;
      await txn.save();

      const ref = txn.local_txn_id;
      const expectedAmount = Number(txn.amount);

      const res = await checkPaymentByReference({ reference: ref, expectedAmount });
      if (!res.supported) {
        if (!warnedUnsupported) {
          warnedUnsupported = true;
          console.warn('[UPI Polling] Skipping — UPI_STATUS_URL not configured');
        }
        continue;
      }

      if (res.success) {
        // Optional: validate credited VPA if present
        if (expectedVpa && res.payeeVpa && String(res.payeeVpa).toLowerCase() !== expectedVpa) {
          console.warn(`[UPI Polling] VPA mismatch for ${ref}: got=${res.payeeVpa}, expected=${expectedVpa}`);
          continue;
        }
        try {
          // Idempotent update to PAID
          const fresh = await Txn.findOne({ where: { local_txn_id: ref } });
          if (!fresh) continue;
          if (['PAID', 'PROCESSING', 'COMPLETED'].includes(fresh.status)) continue;

          fresh.status = 'PAID';
          fresh.payment_method = 'UPI_DIRECT';
          fresh.payment_id = res.raw?.utr || res.raw?.rrn || res.raw?.transactionId || fresh.payment_id || null;
          fresh.payment_raw = res.raw || res;
          fresh.updated_at = new Date();
          await fresh.save();

          enqueueAutoRecharge(fresh.local_txn_id);
          console.log(`[UPI Polling] Marked PAID and enqueued recharge for ${ref}`);
        } catch (e) {
          console.error('[UPI Polling] Failed to mark PAID for', ref, e);
        }
      }
    }
  } catch (e) {
    console.error('[UPI Polling] Cycle error', e);
  }
}

function startUPIPolling() {
  const interval = Number(process.env.UPI_POLL_INTERVAL_MS || 10000);
  if (timer) clearInterval(timer);
  timer = setInterval(runUPIPollCycle, interval);
  console.log(`[UPI Polling] Started with interval=${interval}ms`);
}

module.exports = {
  startUPIPolling,
  runUPIPollCycle,
};
