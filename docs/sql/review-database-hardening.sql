-- REVIEW SCRIPT ONLY. Not applied to the hosted database.
-- Verified against the TrustLayer public schema on 2026-10-22.
-- Browser clients only read owned records; authenticated API handlers write
-- using service_role. This keeps existing SELECT policies intact.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  public.projects, public.milestones, public.submissions,
  public.ai_evaluations, public.disputes, public.activity_events,
  public.paypal_webhook_events
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.projects, public.milestones, public.submissions,
  public.ai_evaluations, public.disputes, public.activity_events
TO authenticated;

-- The webhook ledger intentionally has no browser policies or privileges.
-- The trigger only changes NEW.updated_at; it needs no search-path lookup.
ALTER FUNCTION public.update_updated_at() SET search_path = '';

COMMIT;

-- Read-only verification after applying:
SELECT c.relname, r.rolname,
  has_table_privilege(r.rolname, c.oid, 'SELECT') AS can_select,
  has_table_privilege(r.rolname, c.oid, 'INSERT') AS can_insert,
  has_table_privilege(r.rolname, c.oid, 'UPDATE') AS can_update,
  has_table_privilege(r.rolname, c.oid, 'DELETE') AS can_delete,
  has_table_privilege(r.rolname, c.oid, 'TRUNCATE') AS can_truncate
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND r.rolname IN ('anon', 'authenticated');
