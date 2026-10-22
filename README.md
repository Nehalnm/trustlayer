# TrustLayer

**AI that verifies the work before the money moves.**

A PayPal AI Hackathon project built with Next.js, TypeScript, Tailwind,
Supabase Auth/PostgreSQL, Gemini, and the PayPal Sandbox SDKs.

## Trust model

AI recommends. Policy validates. PayPal executes.

1. Describe a project and generate a structured agreement with measurable criteria.
2. Authorize each milestone through PayPal (authorization is not escrow).
3. Submit actual deliverable source content, a URL, and notes.
4. Analyze source structure and fingerprints, then evaluate criteria with Gemini.
5. Validate the stored evaluation using deterministic release rules.
6. Capture the authorization through the protected release endpoint.
7. Reconcile verified PayPal webhooks and retain activity history.

## Local development

Use Node 24 LTS (tests require native TypeScript stripping).

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000, sign in, and visit `/projects` for your workspace.
On systems without PowerShell script restrictions, `npm` also works.

Create your own `.env.local` with these variable names; never commit its values:

| Variable | Use |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser publishable key |
| SUPABASE_SECRET_KEY | Server-only privileged key |
| GEMINI_API_KEY | Server-only Gemini credential |
| NEXT_PUBLIC_PAYPAL_CLIENT_ID | PayPal Sandbox application ID |
| PAYPAL_CLIENT_SECRET | Server-only PayPal credential |
| NEXT_PUBLIC_PAYPAL_ENVIRONMENT | Use `sandbox` for this demo |
| PAYPAL_WEBHOOK_ID | Sandbox webhook registration ID |

Configure Supabase email confirmation to return to `/auth/callback` on your
local or deployed origin. Configure PayPal Sandbox webhooks for the public
`/api/webhooks/paypal` URL. Do not use production payment credentials for demos.
The current app supports USD payment authorization only.

The existing hosted database was created outside this repository. This repo
is not yet a complete database bootstrap. See [security review](docs/security-review.md)
for the inspected schema, access model, and outstanding database work.

## Checks

Progress is tracked in the [hackathon roadmap](https://github.com/Nehalnm/trustlayer/issues/1)
and the [development log](docs/development-log.md).

```powershell
npm.cmd test
npm.cmd run lint -- app lib components tests
npm.cmd run build
```

Tests mock all route dependencies; they never contact PayPal or Gemini.
The build downloads Geist fonts from Google and requires internet access.

## Demo walkthrough

1. Sign in and create a small USD website project with specific source-verifiable criteria.
2. Explain the generated scope, milestone amounts, and acceptance criteria.
3. Authorize the chosen milestone using a Sandbox buyer.
4. Submit incomplete source and run verification to demonstrate a revision request.
5. Submit revised source and show criterion evidence, fingerprint, and security signals.
6. Explain the independent release policy and dispute blocking.
7. Capture only with explicit approval from the person operating the demo.

Model responses are not guaranteed. Prepare honest complete/incomplete source
fixtures and rehearse; do not weaken the policy to force an approval.

## Current limitations

The interface now uses the [dark design direction](docs/design-direction.md).
Owner-initiated [payment reconciliation](docs/payment-recovery.md) can restore
confirmed existing authorizations or captures. It never requests a new payment
and does not clear uncertain operation locks.

- Source analysis does not execute or render a website or prove visual correctness.
- AI confidence is model-reported, not calibrated correctness probability.
- The workflow is currently owner-operated; separate client/freelancer roles and
  freelancer payouts are not implemented.
- Dispute resolution, authorization replacement, refunds/reversals, and general
  interrupted-operation lock recovery remain incomplete.
- Failed protected operations retain locks. Do not clear locks based on age or
  blindly retry an uncertain capture.
- Legacy projects without an owner stay inaccessible until ownership is reviewed.

Database-hardening migration `20261022122800` was applied and verified on the
hosted project. The SQL in `docs/sql/` is retained as a record; it is not run
automatically by the app. See [database verification](docs/database-hardening.md).
