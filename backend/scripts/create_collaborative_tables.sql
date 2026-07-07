-- ============================================================
-- Digital Knowledge Platform — Collaborative Features Tables
-- ============================================================

-- ─────────────────────────────────────────
-- 1. ANNOTATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annotations (
  id              BIGSERIAL PRIMARY KEY,
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
-- 2. ANNOTATION REPLIES (Threaded Discussions)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annotation_replies (
  id            BIGSERIAL PRIMARY KEY,
  annotation_id BIGINT      NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_text    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id);

-- ─────────────────────────────────────────
-- 3. VIRTUAL READING ROOMS (Study Groups)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_rooms (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  document_id TEXT        NOT NULL,
  host_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_rooms_document_id ON reading_rooms(document_id);

-- ─────────────────────────────────────────
-- 4. READING ROOM MESSAGES (Live Chat)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_room_messages (
  id           BIGSERIAL PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON reading_room_messages(room_id);

-- ─────────────────────────────────────────
-- 5. READING ROOM PRESENCE (Simulated Real-Time Presence)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_room_presence (
  id           BIGSERIAL PRIMARY KEY,
  room_id      BIGINT      NOT NULL REFERENCES reading_rooms(id) ON DELETE CASCADE,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON reading_room_presence(room_id);
