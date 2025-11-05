const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Txn } = require('../models');
const { enqueueAutoRecharge } = require('./rechargeWorker');

let timer = null;

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_');
}

// Basic CSV parser that supports quoted fields and commas inside quotes
function parseCSV(text) {
  const rows = [];
  let i = 0; const n = text.length;
  let field = ''; let row = []; let inQuotes = false; let prev = '';
  function pushField() { row.push(field); field = ''; }
  function pushRow() { rows.push(row); row = []; }
  while (i < n) {
    const ch = text[i++];
    if (inQuotes) {
      if (ch === '"' && text[i] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { pushField(); }
      else if (ch === '\n') { pushField(); pushRow(); }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
    prev = ch;
  }
  // flush
  if (field.length || row.length) { pushField(); pushRow(); }
  return rows;
}

async function listCsvFiles(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.csv'))
      .map(e => path.join(dir, e.name));
  } catch (e) {
    console.warn('[UPI CSV] Cannot read dir', dir, e?.message);
    return [];
  }
}

async function processCsvFile(filePath, config) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const rows = parseCSV(raw);
    if (rows.length <= 1) return 0;
    const header = rows[0].map(normalizeHeader);

    function col(name, def) {
      const key = normalizeHeader(config[name] || def || name);
      const idx = header.indexOf(key);
      return idx >= 0 ? idx : -1;
    }

    // Auto-detect helper by keywords if explicit column not found
    function findIndexByKeywords(hdr, keywords) {
      const idx = hdr.findIndex(h => keywords.some(kw => h.includes(kw)));
      return idx >= 0 ? idx : -1;
    }
    const amountKw  = ['amount', 'amt', 'transaction_amount', 'credit_amount', 'cr_amount', 'paid_amount', 'credit'];
    const vpaKw     = ['vpa', 'upi_id', 'upiid', 'payee_vpa', 'to_vpa', 'beneficiary_vpa', 'payee_upi', 'payee_upi_id', 'to_upi', 'upi'];
    const remarksKw = ['remarks', 'narration', 'note', 'description', 'txn_description', 'message', 'ref', 'reference'];
    const utrKw     = ['utr', 'rrn', 'transaction_id', 'txn_id', 'reference_no', 'ref_no', 'bank_ref'];

    let idxAmount  = col('UPI_CSV_AMOUNT_COL', 'amount');
    let idxVpa     = col('UPI_CSV_VPA_COL', 'payee_vpa');
    let idxRemarks = col('UPI_CSV_REMARKS_COL', 'remarks');
    let idxUtr     = col('UPI_CSV_UTR_COL', 'utr');

    if (idxAmount < 0)  idxAmount  = findIndexByKeywords(header, amountKw);
    if (idxVpa < 0)     idxVpa     = findIndexByKeywords(header, vpaKw);
    if (idxRemarks < 0) idxRemarks = findIndexByKeywords(header, remarksKw);
    if (idxUtr < 0)     idxUtr     = findIndexByKeywords(header, utrKw);

    let matches = 0;
    const ourVpa = (process.env.UPI_PAYEE_VPA || '').trim().toLowerCase();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const amountStr = idxAmount >= 0 ? row[idxAmount] : '';
      const vpaStr    = idxVpa >= 0 ? row[idxVpa] : '';
      const remStr    = idxRemarks >= 0 ? row[idxRemarks] : '';
      const utrStr    = idxUtr >= 0 ? row[idxUtr] : '';

      const vpa = String(vpaStr || '').trim().toLowerCase();
      if (ourVpa && vpa && vpa !== ourVpa) continue; // not ours

      const m = String(remStr || '').match(/FT_[A-Za-z0-9-]+/);
      const localTxnId = m ? m[0] : null;
      if (!localTxnId) continue;

      const amount = Number(String(amountStr || '').replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const txn = await Txn.findOne({ where: { local_txn_id: localTxnId } });
      if (!txn) continue;
      if (['PAID', 'PROCESSING', 'COMPLETED'].includes(txn.status)) continue;

      if (Number(txn.amount) !== Number(amount)) {
        // Amount mismatch; skip
        continue;
      }

      try {
        txn.status = 'PAID';
        txn.payment_method = 'UPI_CSV';
        txn.payment_id = utrStr || txn.payment_id || null;
        txn.payment_raw = { source: path.basename(filePath), row: r, amount, vpa, remarks: remStr, utr: utrStr };
        txn.updated_at = new Date();
        await txn.save();
        enqueueAutoRecharge(localTxnId);
        matches += 1;
        console.log(`[UPI CSV] Matched and marked PAID: ${localTxnId} from ${path.basename(filePath)}#${r}`);
      } catch (e) {
        console.error('[UPI CSV] Failed to mark PAID for', localTxnId, e);
      }
    }
    return matches;
  } catch (e) {
    console.error('[UPI CSV] processCsvFile error for', filePath, e);
    return 0;
  }
}

async function runCsvReconCycle() {
  const dir = (process.env.UPI_CSV_DIR || '').trim();
  if (!dir) {
    console.warn('[UPI CSV] UPI_CSV_DIR not configured; skipping');
    return;
  }
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[UPI CSV] Created CSV directory', dir);
    }
  } catch (e) {
    console.warn('[UPI CSV] Failed to create CSV directory', dir, e?.message);
  }
  const config = {
    UPI_CSV_AMOUNT_COL: process.env.UPI_CSV_AMOUNT_COL,
    UPI_CSV_VPA_COL: process.env.UPI_CSV_VPA_COL,
    UPI_CSV_REMARKS_COL: process.env.UPI_CSV_REMARKS_COL,
    UPI_CSV_UTR_COL: process.env.UPI_CSV_UTR_COL,
  };
  const files = await listCsvFiles(dir);
  let total = 0;
  for (const f of files) {
    total += await processCsvFile(f, config);
  }
  if (total > 0) {
    console.log(`[UPI CSV] Cycle complete. Updated ${total} txns.`);
  }
}

function startUPICsvRecon() {
  const interval = Number(process.env.UPI_CSV_POLL_INTERVAL_MS || 10 * 60 * 1000); // default 10 min
  if (timer) clearInterval(timer);
  timer = setInterval(runCsvReconCycle, interval);
  console.log(`[UPI CSV] CSV recon started with interval=${interval}ms`);
}

module.exports = {
  startUPICsvRecon,
  runCsvReconCycle,
};
