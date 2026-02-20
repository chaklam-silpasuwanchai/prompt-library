```sql
await supabase.rpc('invite_to_workspace', {
  p_workspace_id: 'SHARED_WORKSPACE_ID',
  p_invited_email: 'invitee@example.com',
  p_role: 'viewer'
});
```
