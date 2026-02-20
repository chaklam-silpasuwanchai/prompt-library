```sql
-- Run this in http://localhost:54323 > SQL Editor

-- 1. Create Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, 
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)
);

-- 2. DISABLE RLS (Critical for localhost to work without complex policies)
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
```
