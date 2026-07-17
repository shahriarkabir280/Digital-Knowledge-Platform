-- ============================================================
-- Digital Knowledge Platform — User Profile fields
-- Adds self-service profile data: avatar, bio, links.
-- ------------------------------------------------------------
-- Run this in the Supabase SQL Editor.
-- Idempotent: every statement is IF NOT EXISTS / guarded.
-- ============================================================

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
-- DONE. New: users.{avatar_url, bio, department, phone, cv_url,
-- linkedin_url, github_url, google_scholar_url, website_url}
-- ============================================================
