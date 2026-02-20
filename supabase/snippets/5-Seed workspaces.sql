-- Create a simple workspaces table and seed three default workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert default workspaces (idempotent)
INSERT INTO workspaces (name, description)
VALUES
  ('Personal', 'Private workspace for a single user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO workspaces (name, description)
VALUES
  ('Work', 'Workspace for work-related prompts')
ON CONFLICT (name) DO NOTHING;

-- INSERT INTO workspaces (name, description)
-- VALUES
--   ('Shared', 'Workspace shared between users')
-- ON CONFLICT (name) DO NOTHING;
