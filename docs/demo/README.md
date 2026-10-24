# TrustLayer demo kit

Status: the presenter reported a successful Sandbox rehearsal on 24 October 2026: incomplete work passed 1/7 criteria, revised work passed 7/7, and the milestone showed Paid with capture/release confirmation events. This is user-reported evidence; screenshots and the recording are still pending. The kit itself does not seed rows, fake evaluations, or initiate payments.

## Prepare the session

1. Start `npm.cmd run dev -- --hostname 127.0.0.1 --port 3010` and open http://localhost:3010.
2. Sign in with your own TrustLayer account. Keep passwords, tokens, browser developer tools, and environment files outside the recording.
3. Copy [project-brief.txt](project-brief.txt) into the contract builder. Generating the agreement calls Gemini and creates a real project in your connected database.
4. Review the generated contract before proceeding. It may split the scope across milestones or phrase criteria differently. Confirm USD amounts sum to $10 and each criterion is supported by the complete fixture. Stop and review unexpected scope rather than changing stored results.
5. Keep both HTML files open in your editor. Paste the entire source into **Deliverable content** when submitting. The URL field may be left blank; TrustLayer does not fetch or execute these files.
6. For payment rehearsal, confirm the configured provider environment is Sandbox and use a separate Sandbox buyer account. Authorization is a provider operation; the presenter performs it deliberately. This kit has not tested it.
7. Record the project URL and milestone ID privately so you can resume the same rehearsal. Start the recording signed in, with the project page ready.

## Three-minute presentation

| Time | Show | Say |
| --- | --- | --- |
| 0:00-0:20 | Landing page | "Freelance payments depend on a difficult question: does the delivered work match what we agreed? TrustLayer makes that decision visible before money moves." |
| 0:20-0:45 | Generated contract | "A plain-language request becomes measurable milestones. Here we agreed on a small FocusFlow landing page with navigation, three features, two pricing plans, responsive CSS, and a footer." |
| 0:45-1:05 | Payments or milestone authorization state | "PayPal authorizes the milestone amount. Authorization is not escrow. Capture is a separate step, gated by our server policy." Show an actual authorization only if the presenter has performed one; otherwise explain it as the planned Sandbox step. |
| 1:05-1:35 | Submit incomplete.html, then Run AI verification | "This draft has a heading and one feature, but it is missing agreed scope. We inspect the submitted source and ask Gemini for criterion-by-criterion evidence." Read the actual verdict rather than predicting it. |
| 1:35-2:10 | Submit complete.html, verify, expand evidence | "The revision adds the missing sections. The fingerprint binds the analysis to this exact source. Structural signals support the AI evaluation; they do not prove browser rendering or visual quality." |
| 2:10-2:40 | Evaluation and release controls | "AI recommends. Policy validates. PayPal executes. The server checks criterion coverage, evidence, approval, model-reported confidence, the artifact fingerprint, authorization, and disputes before capture." Do not click Release payment during an unapproved rehearsal. |
| 2:40-3:00 | Activity and payments | "The activity history makes the process traceable. Recovery checks existing PayPal records without creating a new payment. Projects now support separate client and freelancer accounts, with mutual return-to-revision dispute resolution. Freelancer payouts are future work." |

Wait for real requests to finish. For a three-minute video, trim waiting time and label cuts; never substitute a fabricated result.

## Optional approved capture segment

Before an agent performs a Sandbox capture, obtain explicit user confirmation for the displayed milestone and amount. General permission to create a demo is not capture approval. The presenter can also operate the button themselves deliberately.

After confirmation, use **Release payment** once. Show Paid and a real capture reference only after success. Check the Payments and Activity pages. If capture times out or state is uncertain, use **Check PayPal status** for reconciliation; do not clear locks, repeat capture blindly, or present the transaction as successful. Webhook delivery also needs a reachable public endpoint; localhost alone cannot receive PayPal events.

## Expected evidence and fallback

- The incomplete fixture intentionally has no navigation, pricing, media query, or footer and only one feature. A revision request is expected, but model responses are not guaranteed.
- The complete fixture contains navigation with matching anchor targets, all three named features, two priced plans, a narrow-screen grid media query, and a footer. Compare it against the actual generated criteria before submitting.
- An approval is not a guaranteed payment release: confidence below 90%, a dispute, a stale fingerprint, a missing authorization, or an operation lock can still block release.
- If Gemini rejects the revision, show the real reasons and revise the source. Do not edit evaluation rows or lower thresholds. An escalation may require review; do not assume resubmission clears it.
- If an external service fails, continue explaining the prepared source and architecture, explicitly saying that the live step could not be demonstrated. Use a previous recording only if labeled as a previous rehearsal.
- Demonstrate disputes on a separate project with an assigned freelancer after the main recording. Opening a dispute blocks release; both participants must agree on return-to-revision terms. See [two-account instructions](../project-collaboration.md). Existing legacy disputes may need manual review.

## Rehearsal record

Fill this in privately after running the flow; do not publish account details or payment credentials.

- Date and application revision:
- Project URL and chosen milestone:
- Generated criteria reviewed:
- Incomplete submission verdict and missing criteria:
- Revised submission verdict and confidence:
- Artifact fingerprint visible:
- Sandbox authorization status (or skipped):
- Capture explicitly approved, successful, blocked, or skipped:
- Activity/payment records checked:
- Desktop/mobile visual issues:

The fixtures are fictional delivery samples, not evidence of an already completed transaction or a real client engagement.
