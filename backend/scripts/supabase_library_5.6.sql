-- ============================================================
-- Digital Knowledge Platform — Library Management (SRS 5.6)
-- Bug fixes + follow-ups after user testing of 5.5:
--   * holds.item_id / wishlists.item_id FK fix (was pointing at
--     documents(id) instead of catalog_items(id) — this is why
--     "Place Hold" failed with a raw FK-violation/SQL error for
--     any physical catalog item)
--   * subscription renewal requests (member -> librarian)
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor AFTER supabase_library_5.5.sql.
-- Idempotent: safe to re-run.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. FIX holds.item_id FK (was -> documents(id), predates the
-- physical catalog; supabase_library_5.4.sql's
-- `CREATE TABLE IF NOT EXISTS holds` silently no-op'd because the
-- table already existed from the older schema). holds is used
-- exclusively for catalog_items, never documents, so retarget it.
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'holds_item_id_fkey' AND table_name = 'holds'
  ) THEN
    ALTER TABLE holds DROP CONSTRAINT holds_item_id_fkey;
  END IF;
  ALTER TABLE holds
    ADD CONSTRAINT holds_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE;
END $$;

-- Same bug, same fix, for wishlists (also catalog_items-only).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wishlists_item_id_fkey' AND table_name = 'wishlists'
  ) THEN
    ALTER TABLE wishlists DROP CONSTRAINT wishlists_item_id_fkey;
  END IF;
  ALTER TABLE wishlists
    ADD CONSTRAINT wishlists_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE;
END $$;

-- ─────────────────────────────────────────
-- 2. SUBSCRIPTION RENEWAL REQUESTS
-- A member can flag their subscription for renewal; a librarian
-- gets notified and clears the flag by activating/renewing.
-- ─────────────────────────────────────────
ALTER TABLE library_subscriptions ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ;

-- ============================================================
-- DONE. Fixed: holds_item_id_fkey, wishlists_item_id_fkey.
-- Added: library_subscriptions.renewal_requested_at.
-- ============================================================
