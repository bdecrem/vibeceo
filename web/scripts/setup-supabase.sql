-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  favorite_food VARCHAR(255),
  favorite_music VARCHAR(255),
  quote TEXT,
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (you can restrict this later)
CREATE POLICY IF NOT EXISTS "Allow all operations on profiles" ON profiles
  FOR ALL USING (true); 