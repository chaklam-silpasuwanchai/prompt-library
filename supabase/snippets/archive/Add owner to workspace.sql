-- Add an owner row to an existing workspace (run in Supabase SQL editor)

-- 1) Inspect workspaces to find the target workspace id
SELECT id, name FROM workspaces;

-- 2) Inspect auth users to find your user id (or find it in Supabase Auth UI)
SELECT id, email FROM auth.users WHERE email = 'you@your-domain.com';

-- 3) Insert an owner row (replace placeholders with real UUIDs)
INSERT INTO workspace_members (workspace_id, user_id, role, status)
VALUES ('8add84c7-dde8-42ce-95dc-28273ad07ee5', 'c04f87b1-2c69-4e97-a971-50d6524ca8a2', 'owner', 'active');

-- 4) Verify the owner row
SELECT * FROM workspace_members WHERE workspace_id = '8add84c7-dde8-42ce-95dc-28273ad07ee5' AND user_id = 'c04f87b1-2c69-4e97-a971-50d6524ca8a2';

-- Notes:
-- - Run the `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first if your DB uses gen_random_uuid elsewhere and it's missing.
-- - After inserting an owner, the `invite_to_workspace` RPC and the insert policies will allow you to create invites.
