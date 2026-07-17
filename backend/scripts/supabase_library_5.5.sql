-- ============================================================
-- Digital Knowledge Platform — Library Management (SRS 5.5)
-- Online/offline library split follow-up:
--   * structured shelf location (floor / shelf / column)
--   * monthly subscriptions gating physical borrowing
--   * member-initiated borrow requests, librarian-approved
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor AFTER supabase_library_5.4.sql.
-- Idempotent: every statement is IF NOT EXISTS / guarded.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. STRUCTURED PHYSICAL LOCATION
-- catalog_items.location remains the free-text display column used by
-- existing search/facets — these are the structured source fields the
-- "Add Book" form collects; the app composes `location` from them.
-- ─────────────────────────────────────────
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_floor  TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_shelf  TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_column TEXT;

-- ─────────────────────────────────────────
-- 2. LIBRARY SUBSCRIPTIONS (monthly, offline/manual billing)
-- A member needs an ACTIVE row with end_date in the future to borrow
-- from the physical (offline) library. Activated/renewed manually by a
-- librarian (STAFF/LAB_MANAGER/ADMIN) after off-app payment.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT         NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, EXPIRED, CANCELLED
  start_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  end_date     TIMESTAMPTZ  NOT NULL,
  monthly_fee  NUMERIC(10,2) DEFAULT 0,
  activated_by BIGINT       REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_subscriptions_member ON library_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_library_subscriptions_status ON library_subscriptions(status);

-- ─────────────────────────────────────────
-- 3. BORROW REQUESTS (member-initiated, librarian-approved)
-- A member requests to borrow an AVAILABLE catalog item. A librarian
-- reviews the request, verifies subscription/eligibility, and approves
-- it (which creates a `loans` row via the existing checkout path) or
-- rejects it. This sits alongside `holds` (which queue members for
-- currently UNAVAILABLE items) rather than replacing it.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS borrow_requests (
  id              BIGSERIAL PRIMARY KEY,
  item_id         BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  member_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CANCELLED
  requested_days  INTEGER,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at      TIMESTAMPTZ,
  decided_by      BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  reject_reason   TEXT,
  loan_id         BIGINT      REFERENCES loans(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrow_requests_item   ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_member ON borrow_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);

-- ============================================================
-- DONE. New/changed: catalog_items.location_{floor,shelf,column},
-- library_subscriptions, borrow_requests.
-- ============================================================
