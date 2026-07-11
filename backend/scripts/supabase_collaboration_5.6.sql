-- ============================================================
-- Digital Knowledge Platform — SRS 5.6 Collaborative Features
-- Supabase / PostgreSQL migration
-- FR-DKP-037 Annotations · 038 Discussions · 039 Export · 040 Reading Rooms + Invites
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste this file → Run.
--   (Or: psql "$DATABASE_URL" -f backend/scripts/supabase_collaboration_5.6.sql)
--
-- Safe to run multiple times: every statement uses IF NOT EXISTS.
-- Assumes a `users` table with a BIGINT `id` primary key already exists.
-- Auth is enforced at the API layer (JWT), so NO row-level security is
-- added here — matching the rest of this project's schema.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. ANNOTATIONS  (FR-DKP-037: highlight + comment + permissions)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annotations (
  id              BIGSERIAL   PRIMARY KEY,
  document_id     TEXT        NOT NULL,
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

-- ─────────────────────────────────────────
-- 2. ANNOTATION REPLIES  (FR-DKP-038: threaded discussion)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annotation_replies (
  id            BIGSERIAL   PRIMARY KEY,
  annotation_id BIGINT      NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_text    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id);

-- ─────────────────────────────────────────
-- 3. VIRTUAL READING ROOMS  (FR-DKP-040: study groups)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_rooms (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        NOT NULL,
  document_id TEXT        NOT NULL,
  host_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_rooms_document_id ON reading_rooms(document_id);

-- ─────────────────────────────────────────
-- 4. READING ROOM MESSAGES  (FR-DKP-040: live chat)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_room_messages (
  id           BIGSERIAL   PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON reading_room_messages(room_id);

-- ─────────────────────────────────────────
-- 5. READING ROOM PRESENCE  (FR-DKP-040: real-time presence)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_room_presence (
  id           BIGSERIAL   PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON reading_room_presence(room_id);

-- ─────────────────────────────────────────
-- 6. READING ROOM MEMBERS  (FR-DKP-040: invite members)
--    role:   HOST | MEMBER
--    status: INVITED | JOINED
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_room_members (
  id          BIGSERIAL   PRIMARY KEY,
  room_id     BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  role        TEXT        NOT NULL DEFAULT 'MEMBER',
  status      TEXT        NOT NULL DEFAULT 'INVITED',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_member UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON reading_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON reading_room_members(user_id);

-- ─────────────────────────────────────────
-- 7. BACKFILL: make every existing room's host a JOINED member.
--    Without this, rooms created before this migration would have no
--    members and the host-only room list would hide them.
-- ─────────────────────────────────────────
INSERT INTO reading_room_members (room_id, user_id, invited_by, role, status)
SELECT r.id, r.host_id, r.host_id, 'HOST', 'JOINED'
FROM reading_rooms r
ON CONFLICT (room_id, user_id) DO NOTHING;

-- ============================================================
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name LIKE 'reading_room%' OR table_name LIKE 'annotation%';
-- ============================================================
