# TrustLayer development log

Roadmap: [GitHub issue #1](https://github.com/Nehalnm/trustlayer/issues/1).

Each entry records the problem, resulting behavior, validation, and remaining
work. Link the issue and pull request when available. Distinguish local changes,
committed changes, hosted migrations, and deployed behavior.

## 2026-10-22 — Architecture audit and workflow reliability

Status: checkpoint prepared for draft review on
`codex/hackathon-security-checkpoint`; not merged or deployed.

### Problem

The application needed a verified architecture map and consistent access and
workflow checks before adding more payment and demo features.

### Changes

- Inspected the existing Next.js routes, Supabase schema and policies, Gemini
  verification, deterministic release policy, and PayPal authorization flow.
- Protected project pages and strengthened owner checks on milestone routes.
- Aligned escalation and dispute handling with the database's allowed states.
- Serialized submission and verification with existing protected operations.
- Handled the case where a webhook records a capture before the release route.
- Added an authenticated project list, sign-out, evidence error feedback,
  reduced-motion support, and project metadata.
- Added setup documentation, a demo walkthrough, and mocked reliability tests.

### Validation

- 22 tests passed, including actual route code with mocked external dependencies.
- Production build passed.
- Lint: zero errors and six warnings.
- Read-only database checks confirmed anonymous isolation and owner project visibility.
- No hosted schema/data changes and no PayPal captures were performed.

### Next

1. Review and publish the current changes through a pull request.
2. Apply and verify database hardening as a recorded migration.
3. Implement controlled payment reconciliation and lock recovery.
4. Complete dispute resolution and client/freelancer permissions.
5. Test webhook replay and full browser flows before approved Sandbox captures.

The detailed local engineering findings are in `security-review.md`.
The SQL review script was pending at this checkpoint; see the subsequent entry.

## 2026-10-22 — Hosted database access hardening

Status: applied and verified on hosted Supabase. Application PR #2 remains a draft.
Pull request: https://github.com/Nehalnm/trustlayer/pull/2
Roadmap: https://github.com/Nehalnm/trustlayer/issues/1

### Problem

Database grants gave browser roles privileges beyond the application's owner-only
read model. The timestamp trigger also used a mutable search path.

### Changes

- Applied migration `20261022122800`, `harden_browser_table_grants_and_trigger_search_path`.
- Revoked all seven tables' browser grants, restoring only authenticated SELECT
  on the six application tables. The webhook ledger remains server-only.
- Set `public.update_updated_at()` search_path to an empty value.
- Preserved the existing owner policies and service-role privileges.

### Validation

- Passed 168 effective table-privilege comparisons across three roles and seven tables.
- Confirmed all six policies unchanged and RLS enabled on all seven tables.
- Confirmed all seven row counts unchanged.
- Read-only role tests passed: owner project visibility, unrelated identity isolation,
  anonymous access denial, and authenticated webhook-ledger denial.
- Supabase migration history contains the applied version; trigger advisor warning cleared.
- Leaked-password protection remains a separate configuration follow-up.
- No application records were edited and no payment calls were made.

### Remaining work

Controlled reconciliation, operation-lock recovery, dispute resolution, and
client/freelancer permissions. See `database-hardening.md` for verification detail.

## 2026-10-22 — Dark interface and existing-payment reconciliation

Status: implemented in [draft PR #3](https://github.com/Nehalnm/trustlayer/pull/3)
on `codex/dark-ui-payment-recovery`. Not merged or deployed.

### Problem

The owner wanted a more polished dark interface and a conservative way to inspect
and recover existing PayPal records after an interrupted request.

### Changes

- Charcoal UI with blue actions and mint accents across landing, account,
  project list, agreement, payment, activity, milestone, and evidence surfaces.
- Added shared brand/glyph components, a redesigned illustrative hero console,
  responsive project navigation, milestone cards, focus/reduced-motion treatment.
- Hosted card fields use dark input styles and the actual milestone amount.
- Added owner-only Check PayPal status, strict provider-evidence validation, and
  reconciliation of matching existing captures or unexpired authorizations.
- Release records capture intent before contacting PayPal and records responses
  before finalizing local state. No new schema is needed.
- Locked releases show a paused action and a payment-status check.

### Validation

- 44 automated tests passed with mocked external services.
- Production build passed; lint has zero errors and three existing warnings.
- HTTP checks: landing/login 200; project list redirects signed-out users to login.
- Browser tooling reported no connected browser; screenshots, signed-in visuals,
  mobile viewport interaction, and card-field rendering remain unverified.
- No live PayPal calls, captures, or hosted database changes were made in this step.

### Remaining work

General lock recovery still needs controlled investigation; this feature never
automatically clears uncertain locks or retries captures. Separate roles,
dispute resolution, refund/reversal lifecycle, and approved Sandbox end-to-end
tests remain pending. See `payment-recovery.md` and `design-direction.md`.

## Entry template

```markdown
## YYYY-MM-DD — Short change title

Status: local / committed / deployed
Issue: URL
Pull request: URL

### Problem
What needed to change and why.

### Changes
What the final implementation does.

### Validation
Tests/checks performed and their results; identify mocked external services.

### Remaining work
Known limitations, pending migrations, or follow-up issues.
```
