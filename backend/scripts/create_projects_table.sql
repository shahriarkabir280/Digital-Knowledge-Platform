-- ============================================================
-- Digital Knowledge Platform — Projects Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE IF NOT EXISTS projects (
  id               BIGSERIAL PRIMARY KEY,
  uploader_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  long_description TEXT        NOT NULL,
  category         TEXT        NOT NULL,
  academic_year    TEXT        NOT NULL,
  team_members     JSONB       NOT NULL DEFAULT '[]', -- array of strings
  supervisor       TEXT        NOT NULL DEFAULT 'TBA',
  tags             JSONB       NOT NULL DEFAULT '[]', -- array of strings
  thumbnail        TEXT,
  repo_url         TEXT,
  demo_url         TEXT,
  screenshots      JSONB       NOT NULL DEFAULT '[]', -- array of strings
  comments         JSONB       NOT NULL DEFAULT '[]', -- JSON array of comments
  learning_resources JSONB     NOT NULL DEFAULT '[]', -- JSON array of resources
  state            TEXT        NOT NULL DEFAULT 'pending', -- pending / published / rejected
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_uploader_id ON projects(uploader_id);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);
