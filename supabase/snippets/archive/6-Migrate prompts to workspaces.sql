-- Ensure workspaces table exists (idempotent)
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Ensure default workspaces exist
INSERT INTO workspaces (name, description)
VALUES
  ('Personal', 'Private workspace for a single user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO workspaces (name, description)
VALUES
  ('Work', 'Workspace for work-related prompts')
ON CONFLICT (name) DO NOTHING;

INSERT INTO workspaces (name, description)
VALUES
  ('Shared', 'Workspace shared between users')
ON CONFLICT (name) DO NOTHING;

-- Add workspace_id column to prompts if not exists
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- If there's an old text column `workspace`, migrate its values to workspace_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='prompts' AND column_name='workspace'
  ) THEN
    -- For any prompts that have a named workspace, map to the workspace id
    UPDATE prompts p
    SET workspace_id = w.id
    FROM workspaces w
    WHERE p.workspace IS NOT NULL AND w.name = p.workspace;
  END IF;
END
$$;

-- Set workspace_id to Personal for any rows still NULL
UPDATE prompts p
SET workspace_id = (
  SELECT id FROM workspaces WHERE name = 'Personal' LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make workspace_id NOT NULL and add foreign key constraint
ALTER TABLE prompts
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE prompts
  ADD CONSTRAINT prompts_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  ON DELETE RESTRICT;

-- Optionally drop the old text column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='prompts' AND column_name='workspace'
  ) THEN
    ALTER TABLE prompts DROP COLUMN workspace;
  END IF;
END
$$;
