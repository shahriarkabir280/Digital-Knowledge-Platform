-- ============================================================
-- Digital Knowledge Platform — Role Change Requests
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor.
-- Idempotent: every statement is IF NOT EXISTS / guarded.
-- ============================================================

CREATE TABLE IF NOT EXISTS role_change_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role  TEXT        NOT NULL,
  reason          TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  decided_by      BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_change_requests_user_id ON role_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_status  ON role_change_requests(status);
