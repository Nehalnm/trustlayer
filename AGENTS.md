# TrustLayer — Codex Project Handover

## Project Identity

Name: TrustLayer

Tagline: AI that verifies the work before the money moves.

Product: AI-powered freelance contract, deliverable verification,
and protected milestone payment platform.

Built for a PayPal AI Hackathon.

Goal: Build a technically impressive, visually exceptional,
secure, fully demonstrable hackathon project.

## Core Product Flow

1. Client describes freelance work in natural language.
2. Gemini generates a structured contract.
3. Contract contains milestones and measurable acceptance criteria.
4. Client authorizes milestone payment through PayPal Sandbox.
5. Freelancer submits actual deliverable content.
6. Artifact analyzer extracts deterministic structural evidence.
7. Gemini evaluates the deliverable against acceptance criteria.
8. Deterministic payment policy validates release eligibility.
9. PayPal captures the previously authorized payment.
10. TrustLayer records payment and activity history.

Principle:
AI recommends. Policy validates. PayPal executes.

Do not describe PayPal authorization as escrow.

## Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL and Authentication
- Supabase RLS
- Gemini API using @google/genai
- PayPal Server SDK
- PayPal React SDK
- Node.js
- VS Code on Windows

## Existing Architecture

app/api/ai/contract:
AI contract generation, validation, project and milestone creation.

app/api/milestone/[milestoneId]/order:
Creates PayPal AUTHORIZE orders.

app/api/milestone/[milestoneId]/authorize:
Authorizes PayPal payments.

app/api/milestone/[milestoneId]/submit:
Creates versioned deliverable submissions.

app/api/milestone/[milestoneId]/verify:
Runs artifact analysis and Gemini evaluation.

app/api/milestone/[milestoneId]/evaluation:
Returns the latest evaluation and artifact evidence.

app/api/milestone/[milestoneId]/release:
Evaluates deterministic payment policy and captures payment.

app/api/milestone/[milestoneId]/dispute:
Opens disputes and blocks payment release.

app/api/webhooks/paypal:
Verifies PayPal webhook signatures and processes payment events.

lib/verification/analyze-artifact.ts:
Analyzes submitted source text, hashes content using SHA-256,
extracts structural signals and flags suspicious instructions.

lib/payment/policy.ts:
Deterministic payment eligibility checks.

lib/supabase/admin.ts:
Privileged Supabase client. Must never be exposed to browser code.

lib/supabase/server.ts:
Cookie-aware Supabase client for authenticated requests.

components/MilestoneInsights.tsx:
Displays verification, acceptance criteria, artifact evidence,
and payment status.

## Database

Tables:

- projects
- milestones
- submissions
- ai_evaluations
- disputes
- activity_events
- paypal_webhook_events

RLS is enabled.

Projects have a created_by owner column.

AI evaluations include artifact_analysis JSONB.

Milestones include payment_release_locked_at.

The webhook ledger tracks:
RECEIVED, PROCESSING, PROCESSED, FAILED.

## Security Work Completed

- Supabase email/password authentication added.
- Project ownership checks added to major milestone endpoints.
- Main project dashboard secured.
- Payment-release lock introduced.
- Dispute route updated to respect the lock.
- PayPal webhook ledger added for event deduplication and retries.
- Artifact fingerprints and evaluation results used in payment policy.
- PayPal capture uses idempotency protection.

Important:
Review the actual source code before assuming any safeguard
is implemented correctly.

## Current Work

We are auditing remaining privileged routes and project pages.

Main project dashboard access checks have been added.

Payments page access checks have been proposed.
Verify they are applied and build successfully.

Still inspect:

- app/project/[id]/activity/page.tsx
- app/project/[id]/contract/page.tsx
- Other privileged data access paths

## Critical Pending Engineering

1. Audit PayPal capture/webhook race conditions.
2. Build controlled reconciliation for interrupted captures.
3. Implement safe payment-lock recovery.
4. Implement dispute resolution.
5. Verify authorization expiration and capture lifecycle.
6. Test webhook replay and duplicate delivery.
7. Audit all RLS policies and service-role access.
8. Implement proper client/freelancer roles.
9. Run end-to-end Sandbox tests.
10. Improve the Trust Console and frontend design.

Do not trigger actual or Sandbox payment captures without
explicit user confirmation.

## Artifact Verification Limitations

Current analyzer inspects submitted source text.

It does NOT yet execute the submitted website, render a browser,
or prove visual correctness.

Future improvements:

- ZIP upload
- GitHub repository analysis
- HTML/CSS/JS parsing
- Browser-based rendering and screenshot evidence
- Stronger prompt-injection defenses
- Independent evidence validation

Do not claim features are implemented until verified.

## Frontend Direction

Premium, visually memorable fintech product.

Priorities:

- Beautiful landing page
- Clear trust/payment visualizations
- Smooth animations
- Strong evidence dashboard
- Premium typography and spacing
- Excellent demo experience

Prefer free/open-source components.

## Working Instructions for Codex

- Inspect existing files before editing.
- Preserve working features.
- Work one step at a time.
- Explain changes simply.
- Prefer full-file replacements when requested.
- Run npm run build after changes.
- Never reveal or commit secrets.
- Never overwrite .env.local.
- Do not loosen payment security to make demos pass.
- Avoid large refactors without permission.
- Use existing architecture rather than rebuilding from scratch.
- Prioritize hackathon demo quality and engineering reliability.
