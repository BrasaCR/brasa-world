# BRASA Ledger Engine

The **engine of record** for the BRASA Open Ledger. It posts the genesis-locked
**80 / 16 / 3 / 1** allocation of the **0.99% fee** as immutable, hash-chained,
balanced double-entry, and serves the live aggregate the public dashboard reads.

BRASA never holds, custodies, or settles money. Every entry here is a **record of
an allocation**, not a wallet. The double-entry is the proof, not the purse.

> Phase 0 + Phase 1 of *The Open-Source Harvest*: the immutability principle is
> Beancount's, the reconciliation principle is Firefly's — both ported native to
> Workers + D1. The principles travelled; the dependencies did not.

---

## What it guarantees

- **Exact split, to the céntimo.** The 0.99% fee divides 80/16/3/1 with an exact
  integer (largest-remainder, genesis-ordered) distribution. Proven over 200,000
  randomized trials: zero conservation failures.
- **Balanced double-entry.** Each fee event debits `FEE_POOL` and credits the four
  beneficiaries; signed céntimos sum to **zero**. The engine refuses to post if not.
- **Immutable & tamper-evident.** `journal` is append-only and **hash-chained**
  (`prev_hash` → `hash`). Corrections are reversing entries, never edits.
- **Idempotent.** One journal per SINPE `source_ref`; replays return the same id.
- **No simulation.** `/ledger` is computed only from posted entries.

---

## Endpoints

| Method · Path | Purpose |
| --- | --- |
| `POST /ingest` | Record a SINPE-recorded payment → post the split + issue the tiquete. |
| `GET /ledger`  | Public aggregate the Open Ledger dashboard reads (CORS-open). |
| `GET /audit`   | Reconciliation + conservation report; refreshes exceptions. |
| `GET /health`  | Liveness. |

### `POST /ingest`
```json
{ "source_ref": "SINPE-2026-0001", "gross": 18500.00,
  "currency": "CRC", "locale": "es-CR", "owner_ref": "CR-OWNER-9" }
```
`gross` is in colones; pass `gross_minor` (céntimos) to be exact. Returns the
journal id, hash, the four allocations, the tiquete, and the conservation check.

### `GET /ledger` → exactly the dashboard contract
```json
{ "currency": "CRC", "period": "all time",
  "total": 225.03, "grossVolume": 22730.50, "updated": "2026-06-16T09:14:00Z",
  "allocations": { "citizens": 180.02, "planet": 36.00, "operating": 6.76, "founder": 2.25 },
  "series": [ { "t": "2026-06-15", "v": 183.15 }, { "t": "2026-06-16", "v": 225.03 } ],
  "tiquetes": 2, "matchRate": 1.0, "openExceptions": 0 }
```
`total` is the **fee pool** — the amount the split divides. `grossVolume` is the
commerce recorded (context). Optional `?period=YYYY-MM`.

---

## Deploy

```bash
# 1 · create the D1 database, then paste its id into wrangler.toml
wrangler d1 create brasa-ledger

# 2 · apply the schema (local for dev, --remote for production)
wrangler d1 execute brasa-ledger --file=./schema.sql
wrangler d1 execute brasa-ledger --file=./schema.sql --remote

# 3 · ship
wrangler deploy
```

## Wire it up

1. **Dashboard.** Point `MONITOR_URL` in `open-ledger-dashboard.html` at
   `https://brasa-ledger.<subdomain>.workers.dev/ledger` — or have `brasa-monitor`
   fetch-and-passthrough this engine's `/ledger`. The shapes are identical.
2. **Ingestion.** On every SINPE-recorded payment, the POS / `brasa-ai` Worker
   `POST`s to `/ingest` with the `source_ref`, `gross`, and `locale`. The engine
   records the split and issues the tiquete; money continues to move only at the rail.
3. **Reconciliation.** Call `/audit` on a cron (or before publishing) to verify the
   chain, re-detect exceptions, and refresh `matchRate` / `openExceptions`.

---

## Notes

- **Concurrency.** `seq` is the chain order; under a rare simultaneous-ingest race
  the second write loses on `UNIQUE(seq)` and the caller retries. For high volume,
  front `/ingest` with a single Durable Object to serialize the chain head.
- **Append-only.** Never `UPDATE`/`DELETE` `journal`, `postings`, or `tiquetes`.
  A mistake is corrected by posting a `reversal`, preserving the audit trail.
- **Privacy.** Records carry only references and amounts — no conversation, no
  transcript. Structural, not policy.
