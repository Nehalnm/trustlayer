import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeProjectIfPaid } from "@/lib/payment/complete-project";

const PAYPAL_API_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  summary?: string;
  resource?: {
    id?: string;
    status?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
        authorization_id?: string;
        capture_id?: string;
      };
    };
  };
};

type LedgerStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";

type LedgerRow = {
  event_id: string;
  processing_status: LedgerStatus;
  processing_started_at: string | null;
  processed_at: string | null;
};

type MilestoneRecord = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  paypal_order_id: string | null;
  paypal_authorization_id: string | null;
  paypal_capture_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRelatedIds(event: PayPalWebhookEvent) {
  return event.resource?.supplementary_data?.related_ids;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data: unknown = await response.json();

  if (
    !response.ok ||
    !isRecord(data) ||
    typeof data.access_token !== "string"
  ) {
    console.error("PayPal access token request failed.");

    throw new Error("Failed to obtain PayPal access token.");
  }

  return data.access_token;
}

async function verifyPayPalWebhook(
  rawBody: string,
  request: Request,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  let webhookEvent: unknown;

  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
      cache: "no-store",
    },
  );

  const result: unknown = await response.json();

  if (!response.ok) {
    console.error("PayPal webhook signature verification failed.");
    return false;
  }

  return isRecord(result) && result.verification_status === "SUCCESS";
}

async function findMilestone(
  supabase: ReturnType<typeof createAdminClient>,
  column:
    | "id"
    | "paypal_order_id"
    | "paypal_authorization_id"
    | "paypal_capture_id",
  value: string,
) {
  const { data, error } = await supabase
    .from("milestones")
    .select(
      "id, project_id, title, status, paypal_order_id, paypal_authorization_id, paypal_capture_id",
    )
    .eq(column, value)
    .maybeSingle();

  if (error) {
    console.error("Milestone reconciliation lookup failed:", error);
    throw new Error("Could not reconcile the PayPal event to a milestone.");
  }

  return data as MilestoneRecord | null;
}

async function recordPaymentActivity(
  supabase: ReturnType<typeof createAdminClient>,
  milestone: MilestoneRecord,
  event: PayPalWebhookEvent,
  eventType: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  const { error } = await supabase.from("activity_events").insert({
    project_id: milestone.project_id,
    milestone_id: milestone.id,
    event_type: eventType,
    message,
    metadata: {
      paypalEventId: event.id,
      paypalEventType: event.event_type,
      ...metadata,
    },
  });

  if (error) {
    // The event ledger remains the idempotency record.
    // Activity logging errors must be visible in server logs.
    console.error("PayPal activity logging failed:", error);
  }
}

async function handleAuthorizationCreated(
  supabase: ReturnType<typeof createAdminClient>,
  event: PayPalWebhookEvent,
) {
  const authorizationId = event.resource?.id;
  const orderId = getRelatedIds(event)?.order_id;

  if (!authorizationId) {
    throw new Error(
      "Authorization event has no resource ID; reconciliation is required.",
    );
  }

  // The order ID provides a fallback when PayPal's event arrives
  // before the authorize route saves the authorization ID.

  let milestone = await findMilestone(
    supabase,
    "paypal_authorization_id",
    authorizationId,
  );

  if (!milestone && orderId) {
    milestone = await findMilestone(supabase, "paypal_order_id", orderId);
  }

  if (!milestone) {
    throw new Error("No milestone matches this authorization event yet.");
  }

  if (
    milestone.paypal_authorization_id &&
    milestone.paypal_authorization_id !== authorizationId
  ) {
    throw new Error("Authorization ID conflicts with the milestone record.");
  }

  // Recover the out-of-order case. Do not downgrade a milestone
  // that has already advanced past PENDING.

  if (!milestone.paypal_authorization_id) {
    const values: {
      paypal_authorization_id: string;
      status?: string;
    } = {
      paypal_authorization_id: authorizationId,
    };

    if (milestone.status === "PENDING") {
      values.status = "FUNDED";
    }

    const { data: updated, error } = await supabase
      .from("milestones")
      .update(values)
      .eq("id", milestone.id)
      .is("paypal_authorization_id", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Authorization reconciliation update failed:", error);
      throw new Error("Could not save the authorization to the milestone.");
    }

    if (!updated) {
      const current = await findMilestone(supabase, "id", milestone.id);

      if (!current || current.paypal_authorization_id !== authorizationId) {
        throw new Error(
          "The authorization changed concurrently; reconciliation is required.",
        );
      }
    }
  }

  await recordPaymentActivity(
    supabase,
    milestone,
    event,
    "PAYPAL_AUTHORIZATION_CONFIRMED",
    "PayPal confirmed the milestone payment authorization.",
    {
      paypalOrderId: orderId ?? milestone.paypal_order_id,
      paypalAuthorizationId: authorizationId,
    },
  );
}

async function handleCaptureCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  event: PayPalWebhookEvent,
) {
  const captureId = event.resource?.id;
  const relatedIds = getRelatedIds(event);
  const authorizationId = relatedIds?.authorization_id;
  const orderId = relatedIds?.order_id;

  if (!captureId) {
    throw new Error(
      "Capture event has no resource ID; reconciliation is required.",
    );
  }

  if (event.resource?.status && event.resource.status !== "COMPLETED") {
    throw new Error("Capture event status is not COMPLETED.");
  }

  // Try the capture ID first. Fall back to its authorization or
  // order when the release route has not saved the capture yet.

  let milestone = await findMilestone(supabase, "paypal_capture_id", captureId);

  if (!milestone && authorizationId) {
    milestone = await findMilestone(
      supabase,
      "paypal_authorization_id",
      authorizationId,
    );
  }

  if (!milestone && orderId) {
    milestone = await findMilestone(supabase, "paypal_order_id", orderId);
  }

  if (!milestone) {
    throw new Error("No milestone matches this completed capture yet.");
  }

  if (
    authorizationId &&
    milestone.paypal_authorization_id &&
    milestone.paypal_authorization_id !== authorizationId
  ) {
    throw new Error("Capture authorization does not match the milestone.");
  }

  if (
    milestone.paypal_capture_id &&
    milestone.paypal_capture_id !== captureId
  ) {
    throw new Error(
      "A different capture ID is already associated with the milestone.",
    );
  }

  if (milestone.status !== "PAID") {
    const updates: {
      status: string;
      paypal_capture_id: string;
      paypal_authorization_id?: string;
    } = {
      status: "PAID",
      paypal_capture_id: captureId,
    };

    if (authorizationId && !milestone.paypal_authorization_id) {
      updates.paypal_authorization_id = authorizationId;
    }

    const { data: updated, error } = await supabase
      .from("milestones")
      .update(updates)
      .eq("id", milestone.id)
      .is("paypal_capture_id", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Capture reconciliation update failed:", error);
      throw new Error(
        "PayPal completed the capture, but the milestone could not be reconciled.",
      );
    }

    if (!updated) {
      const current = await findMilestone(supabase, "id", milestone.id);

      if (
        !current ||
        current.status !== "PAID" ||
        current.paypal_capture_id !== captureId
      ) {
        throw new Error("The milestone changed during capture reconciliation.");
      }
    }
  } else if (milestone.paypal_capture_id !== captureId) {
    throw new Error(
      "The milestone is marked PAID with an inconsistent capture ID.",
    );
  }

  await completeProjectIfPaid(supabase, milestone.project_id);

  await recordPaymentActivity(
    supabase,
    milestone,
    event,
    "PAYPAL_CAPTURE_CONFIRMED",
    "PayPal confirmed that the milestone payment was captured.",
    {
      paypalCaptureId: captureId,
      paypalAuthorizationId:
        authorizationId ?? milestone.paypal_authorization_id,
    },
  );
}

async function handleCaptureDenied(
  supabase: ReturnType<typeof createAdminClient>,
  event: PayPalWebhookEvent,
) {
  const captureId = event.resource?.id;
  const relatedIds = getRelatedIds(event);
  const authorizationId = relatedIds?.authorization_id;
  const orderId = relatedIds?.order_id;

  let milestone: MilestoneRecord | null = null;

  if (captureId) {
    milestone = await findMilestone(supabase, "paypal_capture_id", captureId);
  }

  if (!milestone && authorizationId) {
    milestone = await findMilestone(
      supabase,
      "paypal_authorization_id",
      authorizationId,
    );
  }

  if (!milestone && orderId) {
    milestone = await findMilestone(supabase, "paypal_order_id", orderId);
  }

  if (!milestone) {
    throw new Error("No milestone matches this denied capture event yet.");
  }

  if (
    authorizationId &&
    milestone.paypal_authorization_id &&
    milestone.paypal_authorization_id !== authorizationId
  ) {
    throw new Error(
      "Denied capture authorization does not match the milestone.",
    );
  }

  // Do not mark a denied capture as PAID or release the lock.
  // The milestone stays blocked until payment reconciliation is complete.

  await recordPaymentActivity(
    supabase,
    milestone,
    event,
    "PAYPAL_CAPTURE_DENIED",
    "PayPal reported that the milestone payment capture was denied.",
    {
      paypalCaptureId: captureId ?? null,
      paypalAuthorizationId:
        authorizationId ?? milestone.paypal_authorization_id,
    },
  );
}

export async function POST(request: Request) {
  let eventId: string | null = null;
  let ledger: ReturnType<typeof createAdminClient> | null = null;
  let ownedClaim: string | null = null;

  try {
    // 1. Verify PayPal's signature against the raw request body.

    const rawBody = await request.text();
    const verified = await verifyPayPalWebhook(rawBody, request);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid PayPal webhook signature." },
        { status: 401 },
      );
    }

    // 2. Validate the event payload.

    let parsedEvent: unknown;

    try {
      parsedEvent = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook JSON." },
        { status: 400 },
      );
    }

    if (
      !isRecord(parsedEvent) ||
      typeof parsedEvent.id !== "string" ||
      typeof parsedEvent.event_type !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid PayPal event payload." },
        { status: 400 },
      );
    }

    const event = parsedEvent as PayPalWebhookEvent;
    eventId = event.id ?? null;

    const resourceId =
      typeof event.resource?.id === "string" ? event.resource.id : null;

    const supabase = createAdminClient();

    /*
     * The event ledger was added after the generated Supabase database
     * types were created. Keep the type escape limited to this table.
     * Regenerate Database types later to remove this adapter.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledgerTable = (
      supabase as unknown as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from: (table: string) => any;
      }
    ).from("paypal_webhook_events");

    ledger = supabase;

    // 3. Persist the verified event. The primary key deduplicates
    // concurrent or repeated deliveries of the same PayPal event ID.

    const { error: insertError } = await ledgerTable.insert({
      event_id: event.id,
      event_type: event.event_type,
      resource_id: resourceId,
      processing_status: "RECEIVED",
      event_payload: event,
    });

    if (insertError && insertError.code !== "23505") {
      console.error("PayPal webhook ledger insert failed:", insertError);

      return NextResponse.json(
        { error: "Could not record the verified PayPal event." },
        { status: 500 },
      );
    }

    // 4. Atomically claim a received or previously failed event.
    // An old PROCESSING claim can also be recovered after five minutes.

    const now = new Date().toISOString();

    const initialClaim = await ledgerTable
      .update({
        processing_status: "PROCESSING",
        processing_started_at: now,
        last_error: null,
      })
      .eq("event_id", event.id)
      .in("processing_status", ["RECEIVED", "FAILED"])
      .select("event_id")
      .maybeSingle();

    let claim = initialClaim.data;
    const claimError = initialClaim.error;

    if (claimError) {
      console.error("PayPal event claim failed:", claimError);

      return NextResponse.json(
        { error: "Could not claim the webhook event." },
        { status: 500 },
      );
    }

    if (!claim) {
      const staleCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const staleClaim = await ledgerTable
        .update({
          processing_status: "PROCESSING",
          processing_started_at: now,
          last_error: null,
        })
        .eq("event_id", event.id)
        .eq("processing_status", "PROCESSING")
        .lt("processing_started_at", staleCutoff)
        .select("event_id")
        .maybeSingle();

      if (staleClaim.error) {
        console.error("PayPal stale-event recovery failed:", staleClaim.error);

        return NextResponse.json(
          { error: "Could not recover the webhook event." },
          { status: 500 },
        );
      }

      claim = staleClaim.data;
    }

    if (!claim) {
      const { data: current, error: currentError } = await ledgerTable
        .select(
          "event_id, processing_status, processing_started_at, processed_at",
        )
        .eq("event_id", event.id)
        .maybeSingle();

      if (currentError || !current) {
        console.error(
          "Could not read PayPal webhook ledger state:",
          currentError,
        );

        return NextResponse.json(
          { error: "Could not determine webhook processing state." },
          { status: 500 },
        );
      }

      if (current.processing_status === "PROCESSED") {
        return NextResponse.json(
          { received: true, duplicate: true },
          { status: 200 },
        );
      }

      // Encourage PayPal to retry if another handler owns this event.
      return NextResponse.json(
        {
          received: true,
          processing: true,
          message: "The event is already being processed. Retry later.",
        },
        { status: 503 },
      );
    }

    // 5. Process the claimed event.
    ownedClaim = now;

    try {
      if (event.event_type === "PAYMENT.AUTHORIZATION.CREATED") {
        await handleAuthorizationCreated(supabase, event);
      } else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        await handleCaptureCompleted(supabase, event);
      } else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
        await handleCaptureDenied(supabase, event);
      }

      // Other verified PayPal event types are recorded and acknowledged.
      // They do not change payment state in this handler.

      const { error: processedError } = await ledgerTable
        .update({
          processing_status: "PROCESSED",
          processed_at: new Date().toISOString(),
          processing_started_at: null,
          last_error: null,
        })
        .eq("event_id", event.id)
        .eq("processing_status", "PROCESSING")
        .eq("processing_started_at", now);

      if (processedError) {
        throw new Error(
          "The webhook was handled, but its ledger status could not be saved.",
        );
      }
    } catch (processingError) {
      const message =
        processingError instanceof Error
          ? processingError.message
          : "Webhook processing failed.";

      console.error(`PayPal event processing failed (${event.id}):`, message);

      const { error: failureRecordError } = await ledgerTable
        .update({
          processing_status: "FAILED",
          processing_started_at: null,
          last_error: message.slice(0, 2000),
        })
        .eq("event_id", event.id)
        .eq("processing_status", "PROCESSING")
        .eq("processing_started_at", now);

      if (failureRecordError) {
        console.error(
          "Could not record PayPal webhook failure:",
          failureRecordError,
        );
      }

      // Non-2xx lets PayPal retry the event. The ledger preserves
      // the full payload for subsequent recovery and investigation.

      return NextResponse.json(
        {
          error:
            "PayPal event processing failed. The event was retained for retry and reconciliation.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { received: true, processed: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("PayPal webhook error:", error);

    // If an unexpected failure occurs after an event ID is known,
    // leave the ledger eligible for recovery when possible.

    if (eventId && ledger && ownedClaim) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ledgerTable = (
          ledger as unknown as {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            from: (table: string) => any;
          }
        ).from("paypal_webhook_events");

        await ledgerTable
          .update({
            processing_status: "FAILED",
            processing_started_at: null,
            last_error:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : "Unexpected webhook processing error.",
          })
          .eq("event_id", eventId)
          .eq("processing_status", "PROCESSING")
          .eq("processing_started_at", ownedClaim);
      } catch (ledgerError) {
        console.error("Webhook failure recovery error:", ledgerError);
      }
    }

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
