-- Create workspace_members table to manage workspace access and roles
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  invited_email text,
  invite_token uuid,
  invited_by uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','requested')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Example Row-Level Security (RLS) policies for Supabase/Postgres
-- Make sure to ENABLE RLS on the tables before adding policies if using Supabase.

-- Enable RLS on relevant tables (run once)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Allow workspace members to SELECT prompts that belong to their workspace
CREATE POLICY "prompts_select_workspace_member" ON prompts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = prompts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  )
);

-- Allow INSERT into prompts only for owners/editors of the target workspace
CREATE POLICY "prompts_insert_workspace_editor" ON prompts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','editor')
      AND wm.status = 'active'
  )
);

-- Allow UPDATE for owners/editors on prompts
CREATE POLICY "prompts_modify_workspace_editor_update" ON prompts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = prompts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','editor')
      AND wm.status = 'active'
  )
);

-- Allow DELETE for owners/editors on prompts
CREATE POLICY "prompts_modify_workspace_editor_delete" ON prompts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = prompts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','editor')
      AND wm.status = 'active'
  )
);

-- Example policies for workspace_members management
-- Only allow owners to manage membership rows for their workspace
CREATE POLICY "workspace_members_manage_by_owner_update" ON workspace_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
      AND wm2.role = 'owner'
      AND wm2.status = 'active'
  )
);

CREATE POLICY "workspace_members_manage_by_owner_delete" ON workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
      AND wm2.role = 'owner'
      AND wm2.status = 'active'
  )
);

CREATE POLICY "workspace_members_insert_by_owner" ON workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_id
      AND wm2.user_id = auth.uid()
      AND wm2.role = 'owner'
      AND wm2.status = 'active'
  )
);

-- NOTE: adapt the use of auth.uid() to your authentication setup in Supabase.
-- Apply these by running this SQL in your Supabase SQL editor or via CLI.
