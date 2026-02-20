-- 1. Add the missing Foreign Key relationship explicitly
ALTER TABLE ratings 
DROP CONSTRAINT IF EXISTS ratings_prompt_id_fkey;

ALTER TABLE ratings
ADD CONSTRAINT ratings_prompt_id_fkey
FOREIGN KEY (prompt_id)
REFERENCES prompts(id)
ON DELETE CASCADE;

-- 2. Force a schema cache reload (Critical for local dev)
NOTIFY pgrst, 'reload config';