-- Todoit shared lists table
-- Run this in Supabase SQL editor to enable share functionality for Todoit

CREATE TABLE IF NOT EXISTS todoit_shares (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  title       text        NOT NULL DEFAULT 'My Todo List',
  tasks_snapshot jsonb   NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todoit_shares_slug_idx ON todoit_shares (slug);
CREATE INDEX IF NOT EXISTS todoit_shares_user_idx ON todoit_shares (user_id);
