CREATE TABLE IF NOT EXISTS single_user_login_attempts (
  identifier_hash TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS single_user_login_attempts_updated_at_idx
  ON single_user_login_attempts (updated_at);
