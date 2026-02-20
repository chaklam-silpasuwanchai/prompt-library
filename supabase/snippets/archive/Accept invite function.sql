-- Function to accept an invite using the invite_token
-- Caller must be authenticated. The function will match the invite by token
-- and the caller's email, then set the membership's user_id and activate it.

CREATE OR REPLACE FUNCTION accept_workspace_invite(p_token uuid)
RETURNS uuid AS $$
DECLARE
  v_email text;
  v_user uuid;
  v_workspace uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user email not found';
  END IF;

  UPDATE workspace_members
  SET user_id = v_user, status = 'active', invite_token = NULL
  WHERE invite_token = p_token AND invited_email = v_email
  RETURNING workspace_id INTO v_workspace;

  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'invite not found or does not match your email';
  END IF;

  RETURN v_workspace;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated role if necessary (Supabase default)
-- GRANT EXECUTE ON FUNCTION accept_workspace_invite(uuid) TO authenticated;
