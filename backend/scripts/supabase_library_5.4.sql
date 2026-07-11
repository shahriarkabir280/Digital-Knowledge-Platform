-- ============================================================
-- Digital Knowledge Platform — Library Management (SRS 5.4)
-- FR-DKP-015 .. FR-DKP-025
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor.
--
-- This file matches the schema the BACKEND CODE actually queries
-- (see the header comments in each repository under
--  backend/src/db/repositories/*.js). It is the authoritative
-- definition — the older Knex migrations under
--  backend/src/db/migrations/2026070*_*.js use different column
-- names (author/status/item_type/publish_year, member_id/catalog_item_id)
-- and DO NOT match the running code. Prefer this file.
--
-- Assumes an existing `users` table with BIGINT `id` PK.
-- Idempotent: every statement is IF NOT EXISTS / guarded.
-- No RLS — authorization is enforced at the API layer
-- (requireAuth + requireRole).
-- ============================================================

-- ─────────────────────────────────────────
-- 1. CATALOG ITEMS  (FR-DKP-015, 023)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_items (
  id                BIGSERIAL PRIMARY KEY,
  title             TEXT        NOT NULL,
  authors           TEXT,
  isbn              TEXT,
  subject           TEXT,
  description       TEXT,
  category          TEXT,                 -- BOOK, JOURNAL, MAGAZINE, THESIS, DVD, OTHER
  language          TEXT        DEFAULT 'en',
  publisher         TEXT,
  publication_year  INTEGER,
  location          TEXT,
  call_number       TEXT,
  cover_image       TEXT,
  total_copies      INTEGER     NOT NULL DEFAULT 1,
  available_copies  INTEGER     NOT NULL DEFAULT 1,
  state             TEXT        NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, WITHDRAWN
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search column the code queries as `search_vector_en`.
-- Generated + STORED so it stays in sync automatically.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'search_vector_en'
  ) THEN
    ALTER TABLE catalog_items
      ADD COLUMN search_vector_en tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
        setweight(to_tsvector('english', coalesce(authors, '')),     'B') ||
        setweight(to_tsvector('english', coalesce(subject, '')),     'C') ||
        setweight(to_tsvector('english', coalesce(description, '')),  'D')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_catalog_items_search   ON catalog_items USING GIN(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_catalog_items_isbn     ON catalog_items(isbn);
CREATE INDEX IF NOT EXISTS idx_catalog_items_state    ON catalog_items(state);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_location ON catalog_items(location);
CREATE INDEX IF NOT EXISTS idx_catalog_items_language ON catalog_items(language);

-- ─────────────────────────────────────────
-- 2. CATALOG COPIES  (per-copy barcodes — FR-DKP-022)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_copies (
  id          BIGSERIAL PRIMARY KEY,
  item_id     BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  barcode     TEXT        UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE, CHECKED_OUT, LOST
  condition   TEXT        DEFAULT 'GOOD',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_copies_item    ON catalog_copies(item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_copies_barcode ON catalog_copies(barcode);

-- ─────────────────────────────────────────
-- 3. LOANS  (FR-DKP-016, 017, 018, 021)
-- Extends the base loans table with library-management columns.
-- If `loans` already exists (from supabase_schema.sql) the CREATE is
-- skipped and the ALTERs below add the missing columns.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id            BIGSERIAL PRIMARY KEY,
  item_id       BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  member_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  copy_id       BIGINT      REFERENCES catalog_copies(id) ON DELETE SET NULL,
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date      TIMESTAMPTZ NOT NULL,
  return_date   TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, OVERDUE, RETURNED
  renewed_count INTEGER     NOT NULL DEFAULT 0,
  issued_by     BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  returned_to   BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  fine_amount   NUMERIC(10,2) DEFAULT 0,
  fine_paid     BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns the library code needs, in case `loans` predates 5.4.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS copy_id       BIGINT REFERENCES catalog_copies(id) ON DELETE SET NULL;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS renewed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS issued_by     BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS returned_to   BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS fine_amount   NUMERIC(10,2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS fine_paid     BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_loans_member   ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_item     ON loans(item_id);
CREATE INDEX IF NOT EXISTS idx_loans_status   ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

-- ─────────────────────────────────────────
-- 4. FINES  (FR-DKP-018)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fines (
  id         BIGSERIAL PRIMARY KEY,
  loan_id    BIGINT       NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id  BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status     TEXT         NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, WAIVED
  paid_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fines_loan   ON fines(loan_id);
CREATE INDEX IF NOT EXISTS idx_fines_member ON fines(member_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);

-- ─────────────────────────────────────────
-- 5. HOLDS  (FR-DKP-019)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holds (
  id         BIGSERIAL PRIMARY KEY,
  item_id    BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  member_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'QUEUED',  -- QUEUED, READY, FULFILLED, CANCELLED
  placed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holds_item   ON holds(item_id);
CREATE INDEX IF NOT EXISTS idx_holds_member ON holds(member_id);
CREATE INDEX IF NOT EXISTS idx_holds_status ON holds(status);

-- ─────────────────────────────────────────
-- 6. WISHLISTS  (FR-DKP-020)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id   BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- ─────────────────────────────────────────
-- 7. AUDIT LOG  (FR-DKP-023 — "audit log maintained")
-- Required by the acceptance criteria. The auditLog repository writes
-- here on every catalog/loan create/update/delete, and the librarian
-- audit view reads from it. Writes are best-effort: if this table is
-- missing the operation still succeeds (the entry is logged to console).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  entity_type TEXT        NOT NULL,           -- 'catalog_item', 'loan', 'fine'
  entity_id   BIGINT      NOT NULL,
  action      TEXT        NOT NULL,           -- CREATE, UPDATE, DELETE
  changed_by  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  old_values  JSONB       DEFAULT '{}'::jsonb,
  new_values  JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);

-- ─────────────────────────────────────────
-- 8. NOTIFICATIONS metadata column
-- The due-tracking job writes a `metadata` JSONB payload. Add it if
-- your notifications table (from supabase_schema.sql) lacks it.
-- ─────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- DONE. Tables: catalog_items, catalog_copies, loans (+cols),
-- fines, holds, wishlists, audit_log, notifications.metadata
-- ============================================================
