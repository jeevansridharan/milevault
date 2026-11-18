# MileVault

MileVault (formerly Milestara) is a milestone crowdfunding prototype for Bitcoin Cash. It combines a React/Vite frontend, Supabase campaign metadata, CashScript escrow contracts, and an Express oracle service.

> This is a hackathon prototype. Mainnet transactions are irreversible. The current Supabase vote path and oracle tally are not fully on-chain, and the WizardConnect connection is not yet the signer used by campaign transactions. Do not represent those steps as trustless/on-chain until that integration is completed and reviewed.

## Pre-existing vs New

### Pre-existing

- Chipnet escrow contract and CashScript release/refund logic.
- CashTokens governance and token scanning experiments.
- Supabase database and React/Vite UI.
- Oracle backend that signs a release proof from Supabase vote records.

### New for BLAZE

- Rebranded interface and package metadata as MileVault.
- Mainnet-default / optional Chipnet network selection through environment configuration.
- Mainnet explorer selection and per-transaction funding cap.
- Mainnet warning, hackathon link banner, and WizardConnect pairing UI.
- Credential-free environment templates and setup notes.

## Current architecture and limits

`src/` contains the React app, wallet context, data access modules, and transaction services. `production/contracts/MilestoneEscrow.cash` is the escrow source; its checked-in JSON artifact is used by CashScript. `backend/server.js` provides the oracle signing API. Supabase stores campaign, milestone, vote, and transaction records.

Campaign creation, campaign metadata, and release status remain database-backed. The oracle bases approval on Supabase vote rows. WizardConnect pairing is implemented, but campaign actions still use the app's separate `mainnet-js` wallet; the WizardConnect manager is not yet adapted to sign CashScript transactions. The demo seed script is not an on-chain seeded campaign. These paths should be completed before claiming a fully on-chain voting/release flow.

## Requirements

- Node.js 20 or newer
- Supabase project with the schema in `src/lib/schema.sql`
- A separately deployed oracle backend for milestone release
- BCH wallet with funds on the selected network

## Setup

```sh
npm install
npm --prefix backend install
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill in the Supabase URL and public anon key in `.env`. Put the service-role key and oracle WIF only in `backend/.env`; never expose either in frontend variables. Apply `src/lib/schema.sql` in the Supabase SQL editor.

Start the backend and frontend in separate terminals:

```sh
npm --prefix backend run dev
npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_BCH_NETWORK` | `mainnet` by default; use `chipnet` only for testing. |
| `VITE_MAX_FUND_BCH` | Maximum one-transaction funding amount (default `0.01 BCH`). |
| `VITE_GOV_TOKEN_CATEGORY_ID` | CashToken category on the selected network; blank means token actions are not configured. |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key. |
| `VITE_ORACLE_URL` | Oracle API base URL. |
| `SUPABASE_URL` | Backend Supabase URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only Supabase service-role key. |
| `ORACLE_WIF` | Backend-only oracle signing key matching the pubkey baked into contracts. |
| `BCH_NETWORK` | Backend network selection, `mainnet` by default or `chipnet`. |
| `FRONTEND_ORIGIN` | Allowed frontend origin for backend CORS. |

The demo presentation and EMBER2026 donation address in the banner are labeled placeholders and must be replaced with verified destinations.

## Deploy

1. Configure frontend production variables (`VITE_BCH_NETWORK=mainnet`, Supabase public values, oracle URL, and a conservative `VITE_MAX_FUND_BCH`).
2. Configure backend secrets in the hosting provider's secret store; set `BCH_NETWORK=mainnet` and `FRONTEND_ORIGIN`.
3. Deploy the backend before enabling campaign contract creation. Verify `/health` and that its oracle public key matches the configured contract signer.
4. Deploy the frontend as a Vite static site. Set SPA fallback routing to `index.html`.
5. Verify the exact campaign contract and recipient address before any mainnet transfer.

## Mainnet readiness checklist

- Configure a real oracle key and ensure each new contract bakes in its matching public key.
- Configure a real CashToken category or disable token actions.
- Connect WizardConnect signing to transaction construction and broadcast.
- Replace Supabase-backed vote tally with verified on-chain token tally and secure the oracle authorization model.
- Create and verify a live demo campaign and complete a small mainnet transaction.


