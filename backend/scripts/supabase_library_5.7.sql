-- ============================================================
-- Digital Knowledge Platform — Library Management (SRS 5.7)
-- Real reviews for physical catalog items (books) — replaces the
-- previously fake, purely client-side "5.0 / 0 reviews" display.
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor AFTER supabase_library_5.6.sql.
-- Idempotent: safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id              BIGSERIAL PRIMARY KEY,
  catalog_item_id BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (catalog_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_catalog_item ON reviews(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user          ON reviews(user_id);

-- ============================================================
-- DONE. New: reviews (one review per member per book, editable).
-- ============================================================
