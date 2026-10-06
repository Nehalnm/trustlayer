import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const PAYPAL_API_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken() {
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
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("PayPal access token error:", data);

    throw new Error("Failed to obtain PayPal access token.");
  }

  return data.access_token as string;
}

async function verifyPayPalWebhook(rawBody: string, request: Request) {
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
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("PayPal webhook verification error:", result);

    return false;
  }

  return result.verification_status === "SUCCESS";
}

export async function POST(request: Request) {
  try {
    /*
     * Read the raw body first.
     * PayPal signature verification depends on
     * the original webhook payload.
     */
    const rawBody = await request.text();

    const verified = await verifyPayPalWebhook(rawBody, request);

    if (!verified) {
      return NextResponse.json(
        {
          error: "Invalid PayPal webhook signature.",
        },
        { status: 401 },
      );
    }

    const event = JSON.parse(rawBody) as {
      id?: string;
      event_type?: string;
      summary?: string;
      resource?: {
        id?: string;
        status?: string;
        supplementary_data?: unknown;
      };
    };

    if (!event.id || !event.event_type) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = createAdminClient();

    /*
     * Basic duplicate protection.
     *
     * PayPal can retry webhook deliveries, so we
     * check whether this event ID has already been
     * recorded.
     */
    const { data: existingEvent } = await supabase
      .from("activity_events")
      .select("id")
      .eq("event_type", "PAYPAL_WEBHOOK_RECEIVED")
      .contains("metadata", {
        paypalEventId: event.id,
      })
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json(
        { received: true, duplicate: true },
        { status: 200 },
      );
    }

    /*
     * Handle authorization creation.
     */
    if (event.event_type === "PAYMENT.AUTHORIZATION.CREATED") {
      const authorizationId = event.resource?.id;

      if (authorizationId) {
        const { data: milestone } = await supabase
          .from("milestones")
          .select("id, project_id, status")
          .eq("paypal_authorization_id", authorizationId)
          .maybeSingle();

        if (milestone) {
          await supabase.from("activity_events").insert({
            project_id: milestone.project_id,
            milestone_id: milestone.id,
            event_type: "PAYPAL_AUTHORIZATION_CONFIRMED",
            message: "PayPal confirmed the milestone payment authorization.",
            metadata: {
              paypalEventId: event.id,
              paypalAuthorizationId: authorizationId,
            },
          });
        }
      }
    }

    /*
     * Handle successful captures.
     */
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = event.resource?.id;

      if (captureId) {
        const { data: milestone } = await supabase
          .from("milestones")
          .select("id, project_id")
          .eq("paypal_capture_id", captureId)
          .maybeSingle();

        if (milestone) {
          await supabase.from("activity_events").insert({
            project_id: milestone.project_id,
            milestone_id: milestone.id,
            event_type: "PAYPAL_CAPTURE_CONFIRMED",
            message:
              "PayPal confirmed that the milestone payment was captured.",
            metadata: {
              paypalEventId: event.id,
              paypalCaptureId: captureId,
            },
          });
        }
      }
    }

    /*
     * Handle denied captures.
     */
    if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
      const captureId = event.resource?.id;

      if (captureId) {
        const { data: milestone } = await supabase
          .from("milestones")
          .select("id, project_id")
          .eq("paypal_capture_id", captureId)
          .maybeSingle();

        if (milestone) {
          await supabase.from("activity_events").insert({
            project_id: milestone.project_id,
            milestone_id: milestone.id,
            event_type: "PAYPAL_CAPTURE_DENIED",
            message:
              "PayPal reported that the milestone payment capture was denied.",
            metadata: {
              paypalEventId: event.id,
              paypalCaptureId: captureId,
            },
          });
        }
      }
    }

    /*
     * Always record receipt of the verified event.
     * This also provides duplicate protection.
     */
    await supabase.from("activity_events").insert({
      event_type: "PAYPAL_WEBHOOK_RECEIVED",
      message: `Received verified PayPal webhook: ${event.event_type}.`,
      metadata: {
        paypalEventId: event.id,
        paypalEventType: event.event_type,
        summary: event.summary ?? null,
      },
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("PayPal webhook error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
