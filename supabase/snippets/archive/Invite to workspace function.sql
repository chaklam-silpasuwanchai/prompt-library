-- Make workspace_members accept email-only invites and provide a safe invite RPC

-- 1) Allow user_id to be NULL so invited email rows can be stored without a user_id
ALTER TABLE workspace_members ALTER COLUMN user_id DROP NOT NULL;

-- 2) Remove previous UNIQUE constraint if it exists (constraint name may vary)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_user_id_key;

-- 3) Create a partial unique index to keep (workspace_id, user_id) unique when user_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_unique
  ON workspace_members (workspace_id, user_id)
  WHERE user_id IS NOT NULL;

-- 4) Create a secure RPC to create email invites. This function verifies the caller
--    is an active owner of the workspace, then inserts an invite row with a generated token.
--    Run this with the Supabase SQL editor as a DB admin (so the function owner is a trusted role).
CREATE OR REPLACE FUNCTION public.invite_to_workspace(
  p_workspace_id uuid,
  p_invited_email text,
  p_role text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inviter uuid := auth.uid();
  new_id uuid;
BEGIN
  -- require inviter to be an active owner
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = inviter
      AND wm.role = 'owner'
      AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO workspace_members (workspace_id, invited_email, invite_token, invited_by, role, status)
  VALUES (p_workspace_id, p_invited_email, gen_random_uuid(), inviter, p_role, 'invited')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 5) Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.invite_to_workspace(uuid, text, text) TO authenticated;

-- Notes:
-- - Run this snippet in Supabase SQL editor (SQL Editor → New query → paste → Run).
-- - The function uses gen_random_uuid(); ensure the pgcrypto extension is enabled in your DB.
-- - For production: ensure the user who creates a workspace also gets an owner row in `workspace_members` at workspace creation time.
