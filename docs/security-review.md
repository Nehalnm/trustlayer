# TrustLayer security review — 2026-10-22

## Live database findings

Read-only inspection confirmed seven public tables, all with RLS enabled.
The six application tables have authenticated owner-only SELECT policies.
There are no browser INSERT/UPDATE/DELETE policies. The webhook ledger has
no browser policies, intentionally keeping it server-only.

Read-only transactions checked anonymous isolation across all seven tables
and owner visibility on projects. These passed. They do not replace HTTP
integration tests with two independent signed-in accounts.

At the initial inspection, all seven tables granted excessive privileges
(including TRUNCATE) to anon and authenticated roles. This was corrected by
hosted migration `20261022122800`,
`harden_browser_table_grants_and_trigger_search_path`, on 2026-10-22.
`sql/review-database-hardening.sql` records the applied statements: browser
grants were revoked, only authenticated application SELECT was restored, and
the timestamp trigger's search path was pinned. Existing policies are unchanged.
See [verification results](database-hardening.md).

The mutable-search-path advisor warning is now cleared. Supabase still reports
[disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
The ledger's [no-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
is expected because all browser access is revoked. Password protection needs
separate Auth configuration review.

Six legacy projects have NULL created_by. They remain inaccessible to owners.
Do not assign these to an arbitrary user or weaken RLS to expose them.

## Application changes

- Explicit ownership checks before privileged reads on all project pages.
- Explicit ownership checks on milestone APIs; admin and PayPal clients marked server-only.
- Legacy unauthenticated order routes return 410 and make no PayPal call.
- Authenticated browser token initialization; no-store responses; USD-only payment guard.
- Submission and verification take the same atomic lock as dispute/release.
- Verification finalization checks the owned lock, review state, and missing capture.
- ESCALATE evaluations map to UNDER_REVIEW submissions and DISPUTED milestones,
  matching the hosted CHECK constraints.
- Every dispute other than RESOLVED blocks release (including AI_REVIEW and AWAITING_HUMAN).
- Release recognizes a matching completed capture already recorded by a webhook.
- Webhook capture recovery also completes the project when all milestones are paid.
- Webhook ledger completion/failure updates are conditional on the owned claim timestamp.

## Remaining work, in order

1. Completed: apply and verify the grants/search-path hardening as hosted migration 20261022122800.
2. Add durable operation records and controlled recovery for interrupted
   submissions, verifications, authorizations, and captures. New shared-lock
   failures intentionally remain blocked; never clear a lock based on age alone.
3. Reconcile authorization expiration, pending/denied captures, refunds, reversals,
   amount/currency/payee evidence, and project completion retries.
4. Implement dispute resolution and separate client/freelancer membership.
   The current app is still an owner-operated workflow; no independent payout exists.
5. Add transactional database operations, version uniqueness, and webhook activity deduplication.
6. Run webhook replay and full two-account browser tests; run Sandbox captures
   only after explicit user confirmation.

## Verification

`npm test` runs pure policy/artifact checks and the actual verification/release
routes with mocked Supabase, Gemini, and PayPal dependencies. No environment
credentials are loaded and no payment network requests are made.
Tests require Node 22.18+ (Node 24 recommended) for native TypeScript stripping.
