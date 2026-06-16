-- ============================================================================
-- BRASA Ledger Engine · system of record (D1 / SQLite)
-- ----------------------------------------------------------------------------
-- BRASA records allocations; it never holds, custodies, or settles money.
-- This ledger is therefore the RECORD, not a wallet. Every fee event is posted
-- as immutable, hash-chained, balanced double-entry. The Open Ledger reads
-- real posted entries from here — no simulation.
--
-- The principle is Beancount's (append-only, audit-by-construction); the
-- substrate is BRASA's own (Workers + D1). The dependency did not travel; the
-- principle did.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Chart of accounts: the genesis fee pool + the four genesis beneficiaries.
-- split_ratio is in basis points of the 0.99% fee (8000+1600+300+100 = 10000).
CREATE TABLE IF NOT EXISTS accounts (
  code         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL,            -- 'pool' | 'beneficiary'
  split_ratio  INTEGER                   -- bps of fee; NULL for the pool
);

-- Immutable journal (append-only). prev_hash/hash form a tamper-evident chain.
CREATE TABLE IF NOT EXISTS journal (
  id           TEXT PRIMARY KEY,         -- uuid
  seq          INTEGER NOT NULL UNIQUE,  -- monotonic chain order
  ts           TEXT NOT NULL,            -- ISO-8601 recorded time
  kind         TEXT NOT NULL,            -- 'fee_allocation' | 'reversal'
  source_ref   TEXT NOT NULL,            -- SINPE-recorded payment reference
  gross_minor  INTEGER NOT NULL,         -- recorded gross value, céntimos (context)
  fee_minor    INTEGER NOT NULL,         -- 0.99% fee, céntimos — the amount split
  currency     TEXT NOT NULL DEFAULT 'CRC',
  locale       TEXT,                     -- locale parameter, as on the rail
  prev_hash    TEXT NOT NULL,
  hash         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_ts ON journal(ts);

-- Double-entry postings (append-only). Signed céntimos per journal sum to zero.
-- Pool is debited (negative); the four beneficiaries are credited (positive).
CREATE TABLE IF NOT EXISTS postings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_id    TEXT NOT NULL REFERENCES journal(id),
  account       TEXT NOT NULL REFERENCES accounts(code),
  amount_minor  INTEGER NOT NULL,
  UNIQUE(journal_id, account)
);
CREATE INDEX IF NOT EXISTS idx_postings_acct ON postings(account);

-- Tiquetes electrónicos (Hacienda v4.4) — issued record tied to the journal.
-- vat_minor is recorded context (13% split at the SINPE rail); BRASA records only.
CREATE TABLE IF NOT EXISTS tiquetes (
  id           TEXT PRIMARY KEY,
  journal_id   TEXT NOT NULL REFERENCES journal(id),
  source_ref   TEXT NOT NULL,
  gross_minor  INTEGER NOT NULL,
  vat_minor    INTEGER NOT NULL,
  owner_ref    TEXT,
  ts           TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT '4.4'
);
CREATE INDEX IF NOT EXISTS idx_tiquetes_ref ON tiquetes(source_ref);

-- Reconciliation exceptions (the engine room). Written by the audit pass.
CREATE TABLE IF NOT EXISTS exceptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL,
  kind         TEXT NOT NULL,            -- unbalanced | orphan_sinpe | orphan_tiquete | chain_break | split_mismatch
  ref          TEXT,
  detail       TEXT,
  status       TEXT NOT NULL DEFAULT 'open',  -- open | resolved
  resolved_ts  TEXT
);
CREATE INDEX IF NOT EXISTS idx_exc_status ON exceptions(status);

-- Idempotency: one journal per SINPE reference.
CREATE TABLE IF NOT EXISTS ingest_log (
  source_ref   TEXT PRIMARY KEY,
  journal_id   TEXT NOT NULL,
  ts           TEXT NOT NULL
);

-- Genesis accounts — the constitution, seeded once.
INSERT OR IGNORE INTO accounts(code,name,kind,split_ratio) VALUES
  ('FEE_POOL', 'BRASA Fee Pool · 0.99%',                 'pool',        NULL),
  ('CITIZENS', 'Citizens · Swiss Stiftung',              'beneficiary', 8000),
  ('PLANET',   'Planet · Swiss Stiftung + Bermuda',      'beneficiary', 1600),
  ('OPERATING','BRASA Operating Fund',                   'beneficiary',  300),
  ('FOUNDER',  'Founder',                                'beneficiary',  100);
