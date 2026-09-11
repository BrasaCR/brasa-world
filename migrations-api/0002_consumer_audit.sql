CREATE TABLE IF NOT EXISTS api_consumer_audit (
  id TEXT PRIMARY KEY,
  consumer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'rotate', 'suspend', 'resume', 'revoke')),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS api_consumer_audit_consumer_index ON api_consumer_audit(consumer_id, occurred_at);
