-- Add a text array column for tags
ALTER TABLE prompts ADD COLUMN tags TEXT[] DEFAULT '{}';