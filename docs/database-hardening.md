# Hosted database hardening

Applied on 2026-10-22 to the connected TrustLayer Supabase project.

Migration version: `20261022122800`  
Name: `harden_browser_table_grants_and_trigger_search_path`

## Applied behavior

| Role | Six application tables | PayPal webhook ledger |
| --- | --- | --- |
| anon | No privileges | No privileges |
| authenticated | SELECT only, subject to unchanged owner RLS | No privileges |
| service_role | Existing full privileges retained | Existing full privileges retained |

The application tables are projects, milestones, submissions, ai_evaluations,
disputes, and activity_events. Browser roles cannot insert, update, delete,
truncate, create references/triggers, or perform table maintenance.

`public.update_updated_at()` now has an explicit empty search path. Its body
only updates `NEW.updated_at`; it needs no unqualified relation lookups.

## Verification performed

- 168 privilege comparisons: eight privileges × three roles × seven tables.
- Compared all six RLS policies with the pre-migration snapshot: unchanged.
- Confirmed RLS remains enabled on every public application table.
- Compared row counts for all seven tables: unchanged.
- Ran a read-only transaction under an existing owner's authenticated identity:
  owner projects were visible; all six application table reads succeeded;
  no project belonging to a different owner was visible; ledger access was denied.
- Ran reads under an unrelated generated authenticated identity: no rows were visible.
- Ran reads under anon: permission denied on all seven tables, as intended.
- Confirmed the migration in hosted migration history and reran security advisors.

These are database role tests, not a substitute for two-account browser or
end-to-end PayPal Sandbox testing. Service-role writes were verified through
effective privileges; no application rows were written to test them.

## Remaining notices

The [mutable function search-path warning](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
is cleared. [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
is still disabled and needs separate Auth configuration review.
The [ledger no-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
is intentional: the server-only ledger has RLS enabled with no browser grants.

## Reproducibility

The hosted migration history is authoritative for this change. The exact DDL is
retained in `sql/review-database-hardening.sql`. That file keeps its original
review name for existing links and is now marked applied. This repository still
does not contain a complete database bootstrap or earlier schema migrations.

Future tables need their own grant and RLS review. This migration intentionally
changes only the seven existing tables; it does not alter default privileges.
