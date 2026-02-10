-- Weekly Goals table
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week TEXT NOT NULL,  -- ISO week format: "2026-W07"
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,  -- Array of {name: string, completed: boolean}
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast week lookups
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_weekly_goals_updated_at ON weekly_goals;
CREATE TRIGGER update_weekly_goals_updated_at
  BEFORE UPDATE ON weekly_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initial data for week 2026-W07
INSERT INTO weekly_goals (week, title, items) VALUES
  ('2026-W07', 'Network with 5 people', '[
    {"name": "Riya Rani", "completed": false},
    {"name": "John Markoff", "completed": false},
    {"name": "Person 3", "completed": false},
    {"name": "Person 4", "completed": false},
    {"name": "Person 5", "completed": false}
  ]'::jsonb),
  ('2026-W07', '5 social networking engagements', '[
    {"name": "Engagement 1", "completed": false},
    {"name": "Engagement 2", "completed": false},
    {"name": "Engagement 3", "completed": false},
    {"name": "Engagement 4", "completed": false},
    {"name": "Engagement 5", "completed": false}
  ]'::jsonb),
  ('2026-W07', 'One Twitter explainer', '[
    {"name": "Write and post Twitter explainer", "completed": false}
  ]'::jsonb);
