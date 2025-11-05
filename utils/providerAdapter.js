const axios = require('axios');
const crypto = require('crypto');

const PROVIDER_NAME = 'CYRUS';

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function rechargeTag({ tag_number, amount, merchant_txn_id }) {
  const apiKey = process.env.CYRUS_API_KEY;
  const baseUrl = process.env.CYRUS_RECHARGE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error('Provider config missing: CYRUS_API_KEY/CYRUS_RECHARGE_URL');
  }

  const payload = {
    tagNumber: tag_number,
    amount: Number(amount),
    merchantTxnId: merchant_txn_id,
  };

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const maxRetries = 3;
  let attempt = 0;
  let lastError;

  while (attempt < maxRetries) {
    try {
      const res = await axios.post(baseUrl, payload, { headers, timeout: 10000 });
      const data = res.data || {};
      // Normalize
      return {
        status: data.status || 'SUCCESS',
        transaction_id: data.transactionId || data.txnId || null,
        raw: data,
      };
    } catch (err) {
      lastError = err;
      attempt += 1;
      const backoff = 500 * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }
  throw lastError || new Error('Provider recharge failed');
}

function verifyWebhook(req) {
  const secret = process.env.CYRUS_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing CYRUS_WEBHOOK_SECRET');

  const signature = req.headers['x-cyrus-signature'] || req.headers['x-signature'] || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

module.exports = {
  PROVIDER_NAME,
  rechargeTag,
  verifyWebhook,
};
