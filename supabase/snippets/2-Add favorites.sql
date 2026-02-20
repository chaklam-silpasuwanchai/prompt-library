-- 1. Create Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- We store the user ID directly
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id) -- Prevent duplicate favorites
);

-- 2. Open permissions for local dev
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;