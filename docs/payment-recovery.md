# Conservative payment reconciliation

## User flow

Open a project's Payments page and select **Check PayPal status** on a milestone
with a linked order. Approved milestones also expose this action in Overview.
Only the authenticated project owner can use the endpoint.

`POST /api/milestone/[milestoneId]/reconcile` reads existing PayPal records using
the Orders and Payments SDK GET methods. It never calls create, authorize,
capture, void, reauthorize, or refund. The POST may synchronize local records.

| PayPal evidence | Local behavior |
| --- | --- |
| One completed capture with matching order, authorization, amount, currency, and merchant | Synchronize PAID and project completion; never issue a new capture |
| One valid, unexpired CREATED authorization, local PENDING milestone, no lock or capture | Restore the existing authorization and FUNDED state |
| Existing authorization with an interrupted operation lock | Report the state and retain the lock |
| Missing evidence, mismatch, partial/multiple captures, refunds, pending or noncompleted capture | Keep payment state blocked for manual investigation |

Amounts are compared in integer USD cents without rounding unsupported
fractions. The provider's capture-details response must independently identify
the linked order and authorization and match the order's receiving merchant.
Optional evidence missing from a PayPal response blocks automatic recovery.

## Durable capture records

The release route saves PAYMENT_CAPTURE_STARTED to activity_events before it
contacts PayPal. Its metadata includes the stable request ID, linked payment
IDs, agreed amount/currency, evaluation/submission references, and lock timestamp.
If this intent cannot be recorded, no capture request is sent.

PAYMENT_CAPTURE_OBSERVED records a returned capture ID/status before finalizing
local PAID state. Reconciliation can use this server-recorded ID when the order
does not list a capture, but it still validates all identifiers, amounts, and the
merchant with an independent PayPal GET request. Neither event stores payer or
card details. Existing table grants keep browser writes unavailable.

## Limits

This is recovery of existing payment evidence, not a general retry or lock-reset
system. No lock is cleared based on age, a missing capture, or a CREATED
authorization. A capture might still be in flight. Successful capture recovery
can leave the historical lock timestamp intact; PAID prevents another release.

Interrupted source submissions/verifications and safe restart of uncertain
captures still need controlled recovery. Authorization replacement,
refund/reversal lifecycle, manual dispute resolution, and full Sandbox tests
remain follow-ups. The existing webhook handler remains a separate reconciliation
path; this feature does not replace it or claim all event races are solved.

## Verification

Tests run actual route code with mocked Supabase and PayPal, and assert owner
checks happen before provider reads, uncertain locks remain, pending/expired or
mismatched evidence is rejected, and no capture is requested by reconciliation.
No live PayPal calls were made during implementation.

Provider references: [show order details](https://developer.paypal.com/sdk/orders/v2/orders-get/)
and [payment related identifiers](https://developer.paypal.com/api/payments/v2/definitions/supplementary_data/).
