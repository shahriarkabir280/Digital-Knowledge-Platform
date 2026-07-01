-- ============================================================
-- Digital Knowledge Platform — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'MEMBER',
  status        TEXT        NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. DOCUMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          BIGSERIAL PRIMARY KEY,
  uploader_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  format      TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  version     INTEGER     NOT NULL DEFAULT 1,
  state       TEXT        NOT NULL DEFAULT 'draft',
  access_tier TEXT        NOT NULL DEFAULT 'REGISTERED',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_state       ON documents(state);

-- ─────────────────────────────────────────
-- 3. METADATA  (one-to-one with documents)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metadata (
  id               BIGSERIAL PRIMARY KEY,
  document_id      BIGINT      NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  author           TEXT,
  abstract         TEXT,
  keywords         TEXT,           -- stored as JSON string e.g. '["tag1","tag2"]'
  language         TEXT,
  published_year   INTEGER,
  department       TEXT,
  course           TEXT,
  subject          TEXT,
  license          TEXT,
  institution      TEXT,
  publisher        TEXT,
  publication_date DATE,
  description      TEXT,
  summary          TEXT,
  extra_data       JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metadata_document_id ON metadata(document_id);

-- ─────────────────────────────────────────
-- 4. DOCUMENT STATE LOGS  (audit trail)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_state_logs (
  id          BIGSERIAL PRIMARY KEY,
  document_id BIGINT      NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_state  TEXT        NOT NULL,
  to_state    TEXT        NOT NULL,
  note        TEXT,
  changed_by  BIGINT      NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_logs_document_id ON document_state_logs(document_id);

-- ─────────────────────────────────────────
-- 5. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id BIGINT      REFERENCES documents(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ─────────────────────────────────────────
-- 6. LOANS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id            BIGSERIAL PRIMARY KEY,
  item_id       BIGINT      NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  member_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date      TIMESTAMPTZ NOT NULL,
  return_date   TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_member_id ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_item_id   ON loans(item_id);

-- ============================================================
-- DONE — all 6 tables created.
-- ============================================================
