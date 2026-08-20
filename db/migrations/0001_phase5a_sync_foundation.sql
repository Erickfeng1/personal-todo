CREATE TABLE IF NOT EXISTS cloud_tasks (
  user_id TEXT NOT NULL,
  id UUID NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  revision BIGINT NOT NULL CHECK (revision > 0),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS cloud_projects (
  user_id TEXT NOT NULL,
  id UUID NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  revision BIGINT NOT NULL CHECK (revision > 0),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS cloud_tags (
  user_id TEXT NOT NULL,
  id UUID NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  revision BIGINT NOT NULL CHECK (revision > 0),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS cloud_settings (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL DEFAULT 'singleton' CHECK (id = 'singleton'),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  revision BIGINT NOT NULL CHECK (revision > 0),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS processed_mutations (
  user_id TEXT NOT NULL,
  mutation_id UUID NOT NULL,
  installation_id UUID NOT NULL,
  result_revision BIGINT NOT NULL CHECK (result_revision > 0),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mutation_id)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS sync_changes (
  sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'tag', 'settings')),
  entity_id TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_deleted_at TIMESTAMPTZ
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS sync_changes_user_sequence_idx
  ON sync_changes (user_id, sequence);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS sync_bootstraps (
  user_id TEXT NOT NULL,
  bootstrap_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'uploading', 'completed', 'failed')),
  expected_counts JSONB NOT NULL CHECK (jsonb_typeof(expected_counts) = 'object'),
  received_counts JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(received_counts) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, bootstrap_id)
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sync_bootstraps_one_active_per_user_idx
  ON sync_bootstraps (user_id)
  WHERE status IN ('started', 'uploading');
