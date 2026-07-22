-- ============================================================
-- Digital Knowledge Platform — CONSOLIDATED Supabase Schema
-- ============================================================
-- Consolidates, in correct dependency order, every schema file under
-- backend/scripts/*.sql into ONE idempotent script:
--   supabase_schema.sql, create_resource_tables.sql, add_resource_category.sql,
--   create_projects_table.sql, create_role_requests_table.sql,
--   create_collaborative_tables.sql, supabase_collaboration_5.6.sql,
--   supabase_library_5.4.sql, supabase_library_5.5.sql,
--   supabase_library_5.6.sql, supabase_library_5.7.sql,
--   supabase_profile_1.0.sql
--
-- Safe to run top-to-bottom on a FRESH Supabase project, and safe to
-- re-run on an existing one (every statement is IF NOT EXISTS / guarded).
--
-- NOTE ON CONFLICTS:
--  * backend/src/db/migrations/*.js (Knex JS migrations) define an
--    OLDER/incompatible shape for catalog/loans/collaboration tables
--    (different column names). They are NOT run automatically at boot
--    and the .sql files explicitly supersede them (see comment header
--    of supabase_library_5.4.sql in the source repo). This script
--    follows the .sql files, which match the code that actually runs.
--  * `documents` + `metadata` (from supabase_schema.sql) are the
--    ORIGINAL single-table design. The live upload/document code
--    (backend/src/modules/documents/resourceStorage.js) writes to the
--    NEWER `research_resources` / `academic_resources` split tables
--    instead. Both are included below for completeness/backward
--    compatibility (the base `loans` FK originally pointed at
--    `documents`, later widened to `catalog_items`), but treat
--    research_resources/academic_resources as the authoritative
--    "digital document" tables for a live demo.
--  * `holds.item_id` / `wishlists.item_id` originally referenced
--    documents(id) in the first migration pass; supabase_library_5.6.sql
--    retargets both to catalog_items(id), which is what this script
--    creates directly (no need to create-then-fix).
-- ============================================================

-- ============================================================
-- 1. USERS  (source: supabase_schema.sql + supabase_profile_1.0.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'MEMBER',   -- ADMIN, STAFF, LAB_MANAGER, REVIEWER, CONTRIBUTOR, MEMBER
  status        TEXT        NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- profile fields (supabase_profile_1.0.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio                TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone              TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_url             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_scholar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url        TEXT;

-- ============================================================
-- 2. DOCUMENTS (legacy single-table model) + METADATA
--    (source: supabase_schema.sql, add_resource_category.sql)
-- ============================================================
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

ALTER TABLE documents ADD COLUMN IF NOT EXISTS resource_category TEXT DEFAULT 'research-paper';

CREATE INDEX IF NOT EXISTS idx_documents_uploader_id       ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_state             ON documents(state);
CREATE INDEX IF NOT EXISTS idx_documents_resource_category ON documents(resource_category);

CREATE TABLE IF NOT EXISTS metadata (
  id               BIGSERIAL PRIMARY KEY,
  document_id      BIGINT      NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  author           TEXT,
  abstract         TEXT,
  keywords         TEXT,           -- JSON string, e.g. '["tag1","tag2"]'
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

-- ============================================================
-- 3. RESEARCH / ACADEMIC RESOURCES — the tables the live upload
--    code actually reads/writes (source: create_resource_tables.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS research_resources (
  id             BIGSERIAL PRIMARY KEY,
  uploader_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  resource_type  TEXT        NOT NULL,   -- research-paper, thesis, dataset, ...
  format         TEXT        NOT NULL,
  file_path      TEXT        NOT NULL,
  version        INTEGER     NOT NULL DEFAULT 1,
  state          TEXT        NOT NULL DEFAULT 'pending',  -- pending, draft, review, published, archived
  access_tier    TEXT        NOT NULL DEFAULT 'REGISTERED',
  author         TEXT,
  abstract       TEXT,
  keywords       TEXT,        -- JSON string
  language       TEXT,
  published_year INTEGER,
  department     TEXT,
  course         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_resources (
  id             BIGSERIAL PRIMARY KEY,
  uploader_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  resource_type  TEXT        NOT NULL,   -- textbook, lecture-note, slide, ...
  format         TEXT        NOT NULL,
  file_path      TEXT        NOT NULL,
  version        INTEGER     NOT NULL DEFAULT 1,
  state          TEXT        NOT NULL DEFAULT 'pending',
  access_tier    TEXT        NOT NULL DEFAULT 'REGISTERED',
  author         TEXT,
  abstract       TEXT,
  keywords       TEXT,
  language       TEXT,
  published_year INTEGER,
  department     TEXT,
  course         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_resources_uploader_id  ON research_resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_research_resources_state        ON research_resources(state);
CREATE INDEX IF NOT EXISTS idx_academic_resources_uploader_id  ON academic_resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_academic_resources_state        ON academic_resources(state);

-- ============================================================
-- 4. NOTIFICATIONS (source: supabase_schema.sql; metadata column
--    added by supabase_library_5.4.sql)
-- ============================================================
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

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- 5. PROJECTS — Student Project Showcase (source: create_projects_table.sql)
--    NOTE: source script starts with `DROP TABLE IF EXISTS projects CASCADE;`
--    — intentionally OMITTED here since this consolidated script must be
--    safe to re-run without destroying existing showcase data.
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                 BIGSERIAL PRIMARY KEY,
  uploader_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT        NOT NULL,
  long_description   TEXT        NOT NULL,
  category           TEXT        NOT NULL,
  academic_year      TEXT        NOT NULL,
  team_members       JSONB       NOT NULL DEFAULT '[]',
  supervisor         TEXT        NOT NULL DEFAULT 'TBA',
  tags               JSONB       NOT NULL DEFAULT '[]',
  thumbnail          TEXT,
  repo_url           TEXT,
  demo_url           TEXT,
  screenshots        JSONB       NOT NULL DEFAULT '[]',
  comments            JSONB       NOT NULL DEFAULT '[]',
  learning_resources  JSONB       NOT NULL DEFAULT '[]',
  state              TEXT        NOT NULL DEFAULT 'pending',  -- pending, published, rejected
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_uploader_id ON projects(uploader_id);
CREATE INDEX IF NOT EXISTS idx_projects_state       ON projects(state);

-- ============================================================
-- 6. ROLE CHANGE REQUESTS (source: create_role_requests_table.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS role_change_requests (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role TEXT        NOT NULL,
  reason         TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  decided_by     BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_change_requests_user_id ON role_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_status  ON role_change_requests(status);

-- ============================================================
-- 6b. DOCUMENT ACCESS REQUESTS — "request access" flow for RESTRICTED
--     documents in research_resources / academic_resources.
-- ============================================================
CREATE TABLE IF NOT EXISTS document_access_requests (
  id             BIGSERIAL PRIMARY KEY,
  document_id    BIGINT      NOT NULL,
  resource_table TEXT        NOT NULL,   -- 'research_resources' | 'academic_resources'
  requester_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message        TEXT,
  status         TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  decided_by     BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_access_requests_document  ON document_access_requests(resource_table, document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_requests_requester ON document_access_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_requests_author    ON document_access_requests(author_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_doc_access_pending
  ON document_access_requests(resource_table, document_id, requester_id) WHERE status = 'PENDING';

-- ============================================================
-- 7. CATALOG (physical library) — item / copies
--    (source: supabase_library_5.4.sql, location cols from 5.5)
-- ============================================================
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
  location          TEXT,                 -- free-text display location (composed from floor/shelf/column)
  call_number       TEXT,
  cover_image       TEXT,
  total_copies      INTEGER     NOT NULL DEFAULT 1,
  available_copies  INTEGER     NOT NULL DEFAULT 1,
  state             TEXT        NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, WITHDRAWN
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- structured shelf location (supabase_library_5.5.sql)
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_floor  TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_shelf  TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS location_column TEXT;

-- generated full-text search column
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
        setweight(to_tsvector('english', coalesce(description, '')), 'D')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_catalog_items_search   ON catalog_items USING GIN(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_catalog_items_isbn     ON catalog_items(isbn);
CREATE INDEX IF NOT EXISTS idx_catalog_items_state    ON catalog_items(state);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_location ON catalog_items(location);
CREATE INDEX IF NOT EXISTS idx_catalog_items_language ON catalog_items(language);

CREATE TABLE IF NOT EXISTS catalog_copies (
  id         BIGSERIAL PRIMARY KEY,
  item_id    BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  barcode    TEXT        UNIQUE,
  status     TEXT        NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE, CHECKED_OUT, LOST
  condition  TEXT        DEFAULT 'GOOD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_copies_item    ON catalog_copies(item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_copies_barcode ON catalog_copies(barcode);

-- ============================================================
-- 8. LOANS — circulation (source: supabase_schema.sql base table,
--    widened by supabase_library_5.4.sql to reference catalog_items
--    and add librarian/fine columns)
-- ============================================================
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

-- in case `loans` predates 5.4 with fewer columns
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

-- ============================================================
-- 9. FINES (source: supabase_library_5.4.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS fines (
  id         BIGSERIAL PRIMARY KEY,
  loan_id    BIGINT        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id  BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status     TEXT          NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, WAIVED
  paid_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fines_loan   ON fines(loan_id);
CREATE INDEX IF NOT EXISTS idx_fines_member ON fines(member_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);

-- ============================================================
-- 10. HOLDS (source: supabase_library_5.4.sql; FK fixed by 5.6
--     to point at catalog_items instead of documents — created
--     correctly here directly)
-- ============================================================
CREATE TABLE IF NOT EXISTS holds (
  id         BIGSERIAL PRIMARY KEY,
  item_id    BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  member_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'QUEUED',  -- QUEUED, READY, FULFILLED, CANCELLED
  placed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- idempotent retarget, in case this table already exists pointing at documents(id)
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

CREATE INDEX IF NOT EXISTS idx_holds_item   ON holds(item_id);
CREATE INDEX IF NOT EXISTS idx_holds_member ON holds(member_id);
CREATE INDEX IF NOT EXISTS idx_holds_status ON holds(status);

-- ============================================================
-- 11. WISHLISTS (source: supabase_library_5.4.sql; FK fixed by 5.6)
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id  BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

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

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- ============================================================
-- 12. AUDIT LOG — catalog/loan/fine changes (source: supabase_library_5.4.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  entity_type TEXT        NOT NULL,   -- 'catalog_item', 'loan', 'fine'
  entity_id   BIGINT      NOT NULL,
  action      TEXT        NOT NULL,   -- CREATE, UPDATE, DELETE
  changed_by  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  old_values  JSONB       DEFAULT '{}'::jsonb,
  new_values  JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);

-- ============================================================
-- 13. LIBRARY SUBSCRIPTIONS (source: supabase_library_5.5.sql;
--     renewal_requested_at added by 5.6)
-- ============================================================
CREATE TABLE IF NOT EXISTS library_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  member_id    BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT          NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, EXPIRED, CANCELLED
  start_date   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  end_date     TIMESTAMPTZ   NOT NULL,
  monthly_fee  NUMERIC(10,2) DEFAULT 0,
  activated_by BIGINT        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE library_subscriptions ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_library_subscriptions_member ON library_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_library_subscriptions_status ON library_subscriptions(status);

-- ============================================================
-- 14. BORROW REQUESTS (source: supabase_library_5.5.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS borrow_requests (
  id             BIGSERIAL PRIMARY KEY,
  item_id        BIGINT      NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  member_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CANCELLED
  requested_days INTEGER,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at     TIMESTAMPTZ,
  decided_by     BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  reject_reason  TEXT,
  loan_id        BIGINT      REFERENCES loans(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrow_requests_item   ON borrow_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_member ON borrow_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);

-- ============================================================
-- 14b. BOOK DONATIONS — offline/physical library donation pipeline.
--      Two entry points feed the same tables: a donor submits an offer via
--      the public form, or a librarian logs one after a walk-in/phone/email
--      conversation (origin = STAFF_ENTERED, may start ACCEPTED/RECEIVED).
-- ============================================================
CREATE TABLE IF NOT EXISTS book_donations (
  id                BIGSERIAL PRIMARY KEY,
  origin            TEXT        NOT NULL DEFAULT 'PUBLIC_FORM',  -- PUBLIC_FORM, STAFF_ENTERED
  donor_user_id     BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  donor_name        TEXT        NOT NULL,
  donor_email       TEXT        NOT NULL,
  donor_phone       TEXT,
  donor_affiliation TEXT,        -- ALUMNI, FACULTY, STUDENT, PUBLIC, ORGANIZATION
  delivery_method   TEXT        NOT NULL DEFAULT 'DROP_OFF',  -- DROP_OFF, PICKUP_REQUESTED, ALREADY_RECEIVED
  notes             TEXT,
  reference_code    TEXT        NOT NULL UNIQUE,   -- e.g. "DON-7F3K9Q" — shown to donor for status lookup
  status            TEXT        NOT NULL DEFAULT 'SUBMITTED',
    -- SUBMITTED, ACCEPTED, DECLINED, RECEIVED, COMPLETED, CANCELLED
  staff_note        TEXT,
  decided_by        BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  decided_at        TIMESTAMPTZ,
  received_by       BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  received_at       TIMESTAMPTZ,
  logged_by         BIGINT      REFERENCES users(id) ON DELETE SET NULL,  -- staff who entered it, if STAFF_ENTERED
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_donation_items (
  id               BIGSERIAL PRIMARY KEY,
  donation_id      BIGINT      NOT NULL REFERENCES book_donations(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  authors          TEXT,
  isbn             TEXT,
  publisher        TEXT,
  publication_year INTEGER,
  quantity         INTEGER     NOT NULL DEFAULT 1,
  condition_notes  TEXT,
  decision         TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, WANTED, NOT_NEEDED, CATALOGED
  catalog_item_id  BIGINT      REFERENCES catalog_items(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_donations_status     ON book_donations(status);
CREATE INDEX IF NOT EXISTS idx_book_donations_donor_user ON book_donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_book_donations_reference  ON book_donations(reference_code);
CREATE INDEX IF NOT EXISTS idx_donation_items_donation   ON book_donation_items(donation_id);

ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS acquisition_source TEXT NOT NULL DEFAULT 'PURCHASE'; -- PURCHASE, DONATION

-- ============================================================
-- 15. REVIEWS — physical catalog item ratings (source: supabase_library_5.7.sql)
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
CREATE INDEX IF NOT EXISTS idx_reviews_user         ON reviews(user_id);

-- ============================================================
-- 16. COLLABORATION — annotations, replies, reading rooms
--     (source: create_collaborative_tables.sql / supabase_collaboration_5.6.sql
--      — identical definitions, 5.6 adds a host-membership backfill)
-- ============================================================
CREATE TABLE IF NOT EXISTS annotations (
  id              BIGSERIAL   PRIMARY KEY,
  document_id     TEXT        NOT NULL,   -- references research_resources/academic_resources.id as text
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_ref     TEXT        NOT NULL,
  quoted_text     TEXT,
  comment_text    TEXT        NOT NULL,
  highlight_color TEXT        NOT NULL DEFAULT 'yellow',
  is_public       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id     ON annotations(user_id);

CREATE TABLE IF NOT EXISTS annotation_replies (
  id            BIGSERIAL   PRIMARY KEY,
  annotation_id BIGINT      NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_text    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id);

CREATE TABLE IF NOT EXISTS reading_rooms (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        NOT NULL,
  document_id TEXT        NOT NULL,
  host_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_rooms_document_id ON reading_rooms(document_id);

CREATE TABLE IF NOT EXISTS reading_room_messages (
  id           BIGSERIAL   PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON reading_room_messages(room_id);

CREATE TABLE IF NOT EXISTS reading_room_presence (
  id           BIGSERIAL   PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON reading_room_presence(room_id);

CREATE TABLE IF NOT EXISTS reading_room_members (
  id          BIGSERIAL   PRIMARY KEY,
  room_id     BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  role        TEXT        NOT NULL DEFAULT 'MEMBER',   -- HOST or MEMBER
  status      TEXT        NOT NULL DEFAULT 'INVITED',  -- INVITED or JOINED
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_member UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON reading_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON reading_room_members(user_id);

-- backfill: make every existing room's host a JOINED member (supabase_collaboration_5.6.sql)
INSERT INTO reading_room_members (room_id, user_id, invited_by, role, status)
SELECT r.id, r.host_id, r.host_id, 'HOST', 'JOINED'
FROM reading_rooms r
ON CONFLICT (room_id, user_id) DO NOTHING;

-- ============================================================
-- DONE.
-- No Row-Level-Security policies, triggers, custom functions, enums,
-- or views were found in any source .sql file — authorization is
-- enforced entirely at the Express API layer (requireAuth/requireRole/
-- requireAdmin middleware), not via Postgres RLS. This matches every
-- source file's own header comment ("No RLS — enforced at API layer").
--
-- Verify installation:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- Expect 24 tables: academic_resources, annotation_replies, annotations,
-- audit_log, borrow_requests, catalog_copies, catalog_items,
-- document_state_logs, documents, fines, holds, library_subscriptions,
-- loans, metadata, notifications, projects, reading_room_members,
-- reading_room_messages, reading_room_presence, reading_rooms,
-- research_resources, reviews, role_change_requests, users, wishlists.
-- ============================================================
