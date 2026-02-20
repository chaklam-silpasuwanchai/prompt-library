-- Create workspace and add creator as owner in one transaction
-- Usage: call this RPC from the client as an authenticated user

CREATE OR REPLACE FUNCTION public.create_workspace(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  creator uuid := auth.uid();
BEGIN
  INSERT INTO workspaces (name) VALUES (p_name) RETURNING id INTO new_id;

  INSERT INTO workspace_members (workspace_id, user_id, role, status)
  VALUES (new_id, creator, 'owner', 'active');

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text) TO authenticated;

-- Notes:
-- - Run this in Supabase SQL editor as a project admin so the function owner is a trusted role.
-- - This ensures new workspaces have an owner automatically and owners can invite members.
