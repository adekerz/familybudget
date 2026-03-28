-- Migration: Add categories and space_settings tables + realtime

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  monthly_limit int,
  is_quick_access boolean DEFAULT false,
  sort_order int DEFAULT 0,
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, space_id)
);

-- 2. Create space settings table
CREATE TABLE IF NOT EXISTS space_settings (
  space_id uuid PRIMARY KEY REFERENCES spaces(id) ON DELETE CASCADE,
  default_ratios jsonb DEFAULT '{"mandatory": 0.5, "flexible": 0.3, "savings": 0.2}'::jsonb,
  income_sources jsonb DEFAULT '[]'::jsonb,
  payers jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Realtime triggers
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE space_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
