-- Business tables for CMS change request workflow

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES user(id),
  type TEXT NOT NULL CHECK (type IN ('upload', 'rename', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  target_path TEXT NOT NULL,
  source_path TEXT,
  staged_r2_key TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  reviewed_by TEXT REFERENCES user(id),
  review_note TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cr_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_cr_user ON change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
