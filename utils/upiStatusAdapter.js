const axios = require('axios');

// Read nested value from object using dot path, supports array indices like items.0.id
function getPath(obj, path, def = undefined) {
  try {
    if (!obj || !path) return def;
    const parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.');
    let cur = obj;
    for (const p of parts) {
      if (p === '') continue;
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return def;
      }
    }
    return cur === undefined ? def : cur;
  } catch {
    return def;
  }
}

// Very simple template replacer for JSON bodies: replaces {{reference}} and {{amount}}
function applyTemplate(jsonString, { reference, amount }) {
  if (!jsonString) return null;
  const replaced = jsonString
    .replace(/\{\{\s*reference\s*\}\}/gi, String(reference || ''))
    .replace(/\{\{\s*amount\s*\}\}/gi, String(amount ?? ''));
  try { return JSON.parse(replaced); } catch { return null; }
}

async function checkPaymentByReference({ reference, expectedAmount }) {
  const baseUrl = (process.env.UPI_STATUS_URL || '').trim();
  if (!baseUrl) {
    return { supported: false, success: false, reason: 'UPI_STATUS_URL not configured' };
  }
  const method = (process.env.UPI_STATUS_METHOD || 'GET').toUpperCase();
  const timeout = Number(process.env.UPI_STATUS_TIMEOUT_MS || 10000);
  const refParam = (process.env.UPI_STATUS_REF_PARAM || 'reference').trim();
  const headersJson = (process.env.UPI_STATUS_HEADERS_JSON || '').trim();
  const apiKey = (process.env.UPI_STATUS_API_KEY || '').trim();
  const bodyTemplate = (process.env.UPI_STATUS_BODY_TEMPLATE || '').trim();

  const statusPath = process.env.UPI_STATUS_PATH_STATUS || 'status';
  const amountPath = process.env.UPI_STATUS_PATH_AMOUNT || 'amount';
  const payeeVpaPath = process.env.UPI_STATUS_PATH_PAYEE_VPA || 'payeeVpa';
  const successValues = (process.env.UPI_STATUS_SUCCESS_VALUES || 'SUCCESS,COMPLETED,CREDIT,CREDITED,OK')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  let url = baseUrl;
  let data = undefined;
  const headers = {};

  if (headersJson) {
    try {
      Object.assign(headers, JSON.parse(headersJson));
    } catch {}
  }
  if (apiKey && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (method === 'GET') {
    const sep = baseUrl.includes('?') ? '&' : '?';
    url = `${baseUrl}${sep}${encodeURIComponent(refParam)}=${encodeURIComponent(reference)}`;
  } else {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    data = applyTemplate(bodyTemplate, { reference, amount: expectedAmount }) || { [refParam]: reference };
  }

  const resp = await axios({ url, method, headers, data, timeout, validateStatus: () => true });
  const payload = resp.data;

  const rawStatus = getPath(payload, statusPath, '');
  const status = String(rawStatus || '').toUpperCase();
  const amtVal = Number(getPath(payload, amountPath, NaN));
  const payeeVpa = String(getPath(payload, payeeVpaPath, '') || '').trim();

  const isSuccess = successValues.includes(status);
  const amountMatches = Number.isFinite(amtVal) && Number(amtVal) === Number(expectedAmount);

  return {
    supported: true,
    httpStatus: resp.status,
    success: isSuccess && amountMatches,
    status,
    amount: amtVal,
    payeeVpa,
    raw: payload,
  };
}

module.exports = {
  checkPaymentByReference,
};
