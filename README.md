# Qubik

Rules-based stock baskets on Base — you approve every change.

v1 is a **Base Sepolia** demo: indexes and permission grants will be recorded onchain in Phase C. It does **not** hold or swap real tokenized stocks (those live on Base mainnet).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- wagmi + viem + TanStack Query
- Coinbase CDP embedded wallet (`@coinbase/cdp-wagmi` / `@coinbase/cdp-react`)
- Coinbase Tokenized Stocks API (reference / NAV data only)
- Motion (subtle UI transitions)

**Do not use OnchainKit** — it is retired.

## Setup

```bash
cp .env.example .env.local
# optional: set NEXT_PUBLIC_CDP_PROJECT_ID to a real UUID from https://portal.cdp.coinbase.com
# allowlist http://localhost:3000 in Embedded Wallet Configuration

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) then **/build**.

> On this Windows machine the native Next SWC binary is invalid, so scripts use `next dev --webpack` (WASM fallback).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local app |
| `npm test` | Basket engine + asset mapper tests |
| `npm run check:assets` | Smoke-check `/api/assets` (dev server must be running) |

## Build status · 15 Nov 2026 IST

### Phase A — complete
1. Scaffold + Base Sepolia wagmi/CDP (no OnchainKit)
2. `GET /api/assets` — Coinbase `tokens[]`, paginated, 10‑min cache
3. Basket engine + Vitest
4. Screens 1–2 via `POST /api/compose`
5. Enterprise UI (IBM Plex, institutional layout)

### Phase B — complete
- Engine hardening: cash sleeve, exclusions, dual flags, empty vibe, zero-weight rejection
- **10/10** unit tests passing

### Phase C — next (not started)
- `QubikIndex` contract on Base Sepolia
- Screen 3: Sign → `createIndex` + `grantPermissions`
- Contract address in env

## Compliance

- Not available to US persons
- No shareholder or voting rights
- Not endorsed by Base, Coinbase, issuers, or listed companies
