# Client/freelancer roles and dispute resolution

Implemented on 24 October 2026. Hosted migration: `20261024042049`
(`project_participants_and_mutual_dispute_resolution`). Source:
[project-collaboration.sql](sql/project-collaboration.sql).

## Permissions

| Action | Client (project creator) | Assigned freelancer | Other account |
| --- | --- | --- | --- |
| Read project, contract, evidence, payments, activity | Yes | Yes | No |
| Assign one existing confirmed freelancer account | Yes | No | No |
| Submit or revise deliverables | Only while no freelancer is assigned (legacy demo) | Yes | No |
| Run Gemini verification | Yes | No | No |
| Authorize, release, or reconcile PayPal payment | Yes | No | No |
| Open a dispute before capture | Yes | Yes | No |
| Propose return to revision | Yes | Yes | No |
| Accept that proposal | Only if the freelancer proposed it | Only if the client proposed it | No |

Roles belong to a project, not a user-editable profile. The same person can be
a client on one project and a freelancer on another. All six existing data tables
retain owner SELECT policies and gain explicit assigned-freelancer SELECT
policies. Browser write privileges remain revoked. Webhook ledger access stays
server-only. Each privileged route still checks the appropriate role.

Assignment shares the project and its history with an existing confirmed account
using its registered email. The interface explains this before the client submits.
The server performs the account lookup; the browser cannot list users. Assignment
cannot replace an existing freelancer, target the client, change a completed or
cancelled project, or race an active/locked milestone operation. Email invitations,
assignment acceptance, replacement, and multiple freelancers are future work.

## Dispute workflow

1. Either participant opens a dispute with a reason.
2. A database transaction locks the project and milestone, verifies membership,
   rejects captured/locked milestones and existing unresolved disputes, records
   the dispute, and sets `DISPUTED` with a dispute-owned operation lock.
3. Either participant proposes specific revision terms. The proposal is immutable
   in this version, so discuss the terms before submitting it.
4. The other participant accepts. The transaction marks the dispute resolved,
   invalidates the latest submission's approval status, and returns the milestone
   to `REVISION_REQUIRED` (or `PENDING` without an authorization).
5. Only that dispute's matching operation lock is cleared. The freelancer must
   submit a fresh version; the client must run verification again. Payment policy
   still checks all criteria, evidence, confidence, authorization, and disputes.

Resolution does not change the contract or acceptance criteria, create a new
authorization, capture money, refund it, or void an authorization. Existing AI
evaluations remain as history. New submissions allocate versions and save the
milestone/activity atomically. Failed transactions leave no partial writes.

Old disputes without recorded lock ownership remain blocked for manual review.
An AI escalation without a normal dispute record also needs review. This is a
mutual return-to-revision workflow, not arbitration: contested settlements,
proposal withdrawal, cancellation, refunds, and post-capture claims remain future
work. Existing unassigned disputes cannot use two-person resolution. Freelancer
assignment does not configure PayPal payees or implement freelancer payouts.

## Verify using two accounts

Use a new project, preserving the successful paid demo as evidence. Do not open
a dispute on that paid milestone or assume it can be reset.

1. Register or create a second confirmed account for the freelancer.
2. As client, open a new project and use **Project team** to assign that email.
3. Sign in as freelancer in a separate browser profile. The project appears in
   the workspace with a Freelancer role. Payment and verification buttons are
   absent. As a third account, the project must be inaccessible.
4. The client authorizes a Sandbox milestone deliberately. As freelancer, submit
   source; as client, verify it. No capture is required to test the dispute flow.
5. Either participant opens a dispute. Propose revision terms. In the other
   account, refresh, read the proposal, and accept it.
6. Confirm payment is not released, the milestone requires revision, the lock is
   clear, and both participants can read the resolution activity.
7. Submit the revision as freelancer and verify as client. Capture remains a
   separate operation requiring explicit approval before an agent performs it.

## Validation

- Production build passed; automated route/policy tests pass.
- [Postgres integration assertions](../tests/project-collaboration.sql) passed
  against the actual hosted functions, including execution as `service_role` and
  SELECTs as `authenticated`. All fixture accounts and rows were rolled back.
- Tests cover outsider access, client submission denial after assignment,
  protected dispute state, two-person agreement, proposal replay, unrelated lock
  rejection, approval invalidation, fresh version allocation, and paid rejection.
- Function privileges verified: invoker execution, empty search path, no public,
  anon, or authenticated EXECUTE; only the server may supply authenticated actors.
- Security advisor findings remain the existing intentional webhook-ledger
  no-policy notice and disabled leaked-password protection warning.
- Browser visual QA and the two-account interactive rehearsal remain pending.
  No PayPal calls were made during implementation or automated checks.
