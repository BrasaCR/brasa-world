CREATE TABLE IF NOT EXISTS api_consumers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL CHECK (json_valid(scopes_json)),
  daily_limit INTEGER NOT NULL CHECK (daily_limit BETWEEN 1 AND 1000000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS api_usage_daily (
  consumer_id TEXT NOT NULL REFERENCES api_consumers(id),
  usage_day TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (consumer_id, usage_day)
);

CREATE INDEX IF NOT EXISTS api_usage_day_index ON api_usage_daily(usage_day);
