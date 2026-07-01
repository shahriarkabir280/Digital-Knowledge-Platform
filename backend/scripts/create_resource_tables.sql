CREATE TABLE IF NOT EXISTS research_resources (
  id BIGSERIAL PRIMARY KEY,
  uploader_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending',
  access_tier TEXT NOT NULL DEFAULT 'REGISTERED',
  author TEXT,
  abstract TEXT,
  keywords TEXT,
  language TEXT,
  published_year INTEGER,
  department TEXT,
  course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_resources (
  id BIGSERIAL PRIMARY KEY,
  uploader_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending',
  access_tier TEXT NOT NULL DEFAULT 'REGISTERED',
  author TEXT,
  abstract TEXT,
  keywords TEXT,
  language TEXT,
  published_year INTEGER,
  department TEXT,
  course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_resources_uploader_id ON research_resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_research_resources_state ON research_resources(state);
CREATE INDEX IF NOT EXISTS idx_academic_resources_uploader_id ON academic_resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_academic_resources_state ON academic_resources(state);
