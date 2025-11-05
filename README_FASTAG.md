# FASTag QR-based Recharge + Auto-Deduct Provider Wallet

Production-ready implementation for SubAdmin FASTag recharges with Razorpay (QR/UPI), provider wallet reservation, Cyrus provider integration, idempotency, and refunds.

## Components
- Backend: Node.js + Express + Sequelize (Postgres)
- Frontend: Next.js SubAdmin app
- Payment: Razorpay (Orders, Webhook)
- Provider: Cyrus via `utils/providerAdapter.js`

## New Backend Files
- `routes/fastagRoutes.js`
- `routes/walletRoutes.js`
- `workers/rechargeWorker.js`
- `utils/providerAdapter.js`
- Models:
  - `models/Tag.js`
  - `models/Wallet.js`
  - `models/WalletLedger.js`
  - `models/Txn.js`
  - `models/RechargeAudit.js`
  - `models/ProviderBalance.js`
- Migration: `migrations/20250924-fastag-schema.js`

`app.js` mounts these routes:
- `/api/fastag` (initiate, webhooks, tags, transactions)
- `/api/wallet` (balance, ledger, confirm-payment)

Raw body parsing for webhooks is enabled for signature verification.

## Environment Variables
Add the following to `RouteBudget_Backend/.env` (do NOT commit this file):

- General
  - `PORT=5000`
  - `JWT_SECRET=...`
  - `FASTAG_TXN_TTL_HOURS=48` (auto-cancel pending transactions older than TTL)

- Razorpay
  - `RAZORPAY_KEY_ID=...`
  - `RAZORPAY_KEY_SECRET=...`
  - `RAZORPAY_WEBHOOK_SECRET=...` (create a webhook in Razorpay dashboard)

- Cyrus Provider
  - `CYRUS_API_KEY=...`
  - `CYRUS_RECHARGE_URL=https://provider.example.com/fastag/recharge` (sample)
  - `CYRUS_WEBHOOK_SECRET=...`

- Database
  - Postgres credentials are configured in `config/config.js` and `models/index.js`. Defaults:
    - DB: `Route-Budget`, user: `postgres`, pass: `root`, host: `localhost`, port: `5432`

## Database Schema
Tables created:
- `tags(id, cab_id, cab_number, tag_number UNIQUE, owner_user_id NOT NULL, balance_cached, status, created_at)`
- `wallets(id, user_id UNIQUE, balance, updated_at)`
- `wallet_ledger(id, local_txn_id UNIQUE, user_id, type, amount, balance_after, meta JSONB, created_at)`
- `txns(id, local_txn_id UNIQUE, user_id, initiated_by, tag_number, cab_id, cab_number, amount, payment_order_id, payment_id, payment_method, payment_meta JSONB, payment_raw JSONB, status, provider_txn_id, provider_status, provider_raw JSONB, created_at, updated_at)`
- `recharge_audit(id, local_txn_id, owner_user_id, initiated_by, tag_number, cab_id, cab_number, amount, result, provider_raw, created_at)`
- `provider_balance(id, provider_name UNIQUE, balance, updated_at)`

Indexes:
- `UNIQUE(local_txn_id)` on `txns`
- index on `tags(owner_user_id, tag_number)`

## Required Provider Balance Seed
Create a provider balance row for Cyrus before testing:

```sql
INSERT INTO provider_balance (provider_name, balance)
VALUES ('CYRUS', 100000.00)
ON CONFLICT (provider_name) DO NOTHING;
```

## Seed a Tag (example)
Seed a tag belonging to your SubAdmin (replace values accordingly):

```sql
INSERT INTO tags (cab_id, cab_number, tag_number, owner_user_id, balance_cached, status, created_at)
VALUES (1, 'MH12AB1234', '34161XXXXXXXXX', 123, 0, 'Active', NOW());
```

`owner_user_id` must match your `admins.id` (the JWT `req.admin.id`).

## Webhook Setup
- Razorpay webhook URL: `POST https://<your-domain>/api/fastag/razorpay-webhook`
  - Events: `payment.captured` (at least)
  - Secret: `RAZORPAY_WEBHOOK_SECRET`
- Cyrus provider webhook URL: `POST https://<your-domain>/api/fastag/provider-webhook`
  - Provider must sign payload with `CYRUS_WEBHOOK_SECRET`

## Run Locally
1. Start Postgres and create DB `Route-Budget` (or adjust config).
2. Install packages:
   - Backend: `npm i`
   - Frontend: `npm i`
3. Backend: `npm run dev` (port 5000).
4. Frontend: `npm run dev` (Next.js) and open the SubAdmin app.

Sequelize `sync({ alter: true })` will create tables if migrations are not run.

## Endpoints
- `POST /api/fastag/initiate-recharge` (auth)
  - Body: `{ tagNumber, cabId, amount }`
  - Returns: `{ localTxnId, paymentOrder, qrPayload, expiresAt }`
- `POST /api/fastag/razorpay-webhook` (Razorpay -> server)
- `POST /api/fastag/provider-webhook` (Cyrus -> server)
- `GET /api/fastag/tags` (auth)
- `GET /api/fastag/transactions` (auth)
- `GET /api/fastag/txn/:localTxnId` (auth)
- `POST /api/wallet/confirm-payment` (auth) — UX convenience only; webhook is authoritative.
- `GET /api/wallet` and `GET /api/wallet/ledger`

## Flow Summary
1. SubAdmin selects their cab and amount in the frontend (`src/app/FastTagPayments/page.jsx`).
2. Frontend calls `POST /api/fastag/initiate-recharge` and opens Razorpay checkout using the returned order.
3. Razorpay captures payment and calls our webhook.
4. Server marks txn `PAID` then asynchronously enqueues `performAutoRecharge(local_txn_id)`.
5. Worker reserves provider_balance atomically; on success calls Cyrus `rechargeTag` with `merchant_txn_id = local_txn_id`.
6. On provider success -> txn `COMPLETED`. On provider failure -> reverse reservation and auto-refund to SubAdmin wallet (ledger written).
7. Provider webhook further updates txn status idempotently.

## Acceptance Tests
- 1) Initiate recharge -> QR/Checkout displayed with `localTxnId`.
- 2) Payment via QR -> Razorpay webhook verifies signature -> `txns.status = PAID`.
- 3) Auto-recharge runs once: reserves `provider_balance`, calls provider with `merchant_txn_id`, on success `txns.status = COMPLETED` and `provider_txn_id` set.
- 4) Provider failure -> provider_balance restored, wallet credited ledger `RECHARGE_REFUND`, `txns.status = FAILED`.
- 5) Duplicate PG/provider webhooks do not double-process or double-refund (idempotency by `local_txn_id`).
- 6) Initiate recharge for other-subadmin's tag -> `403`, no changes.
- 7) Insufficient provider_balance -> `PENDING_PROVIDER_FUNDS` and audit row created.

## Monitoring & Ops (next)
- Threshold alerts for `provider_balance`.
- Alert on >N failed recharges in M minutes.
- Report for unresolved `PENDING_PROVIDER_FUNDS`.
- Reconciliation jobs mapping Razorpay (payment_id/order_id) and provider (provider_txn_id) to `local_txn_id`.

## Security Notes
- Secrets are on server only. Never expose Razorpay secret/provider keys to the client.
- Webhooks verified using HMAC signatures.
- All endpoints are rate-limited (add `express-rate-limit` as needed) and authenticated.
