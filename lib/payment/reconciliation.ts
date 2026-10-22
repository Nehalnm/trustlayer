import type { Order, CapturedPayment } from "@paypal/paypal-server-sdk";

export type RecoveryExpectation = {
  orderId: string;
  authorizationId: string | null;
  captureId: string | null;
  amount: string | number;
  currency: string;
};

/** Compare monetary values in integer cents; never silently round an agreement. */
export function usdCents(value: string | number | undefined): bigint | null {
  const text = typeof value === "number" ? String(value) : value;
  if (!text || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return cents > BigInt(0) ? cents : null;
}

export function inspectRecoveryOrder(expected: RecoveryExpectation, order: Order) {
  if (order.id !== expected.orderId || order.intent !== "AUTHORIZE") {
    throw new Error("The PayPal order does not match this milestone's authorization flow.");
  }
  if (expected.currency !== "USD" || order.purchaseUnits?.length !== 1) {
    throw new Error("This payment requires manual reconciliation of currency or purchase units.");
  }
  const unit = order.purchaseUnits[0];
  const amount = usdCents(expected.amount);
  if (!amount || unit.amount?.currencyCode !== "USD" || usdCents(unit.amount.value) !== amount) {
    throw new Error("The PayPal order amount or currency does not match the agreement.");
  }
  const authorizations = unit.payments?.authorizations ?? [];
  if (authorizations.length !== 1 || !authorizations[0].id) {
    throw new Error("One unambiguous authorization is required for automatic reconciliation.");
  }
  const authorization = authorizations[0];
  if (expected.authorizationId && authorization.id !== expected.authorizationId) {
    throw new Error("The authorization conflicts with the milestone record.");
  }
  if (authorization.amount?.currencyCode !== "USD" || usdCents(authorization.amount.value) !== amount) {
    throw new Error("The authorized amount does not match the agreement.");
  }
  if (unit.payments?.refunds?.length) throw new Error("Refund activity requires manual reconciliation.");
  const captures = unit.payments?.captures ?? [];
  if (captures.length > 1) throw new Error("Multiple captures require manual reconciliation.");
  const captureId = captures[0]?.id ?? expected.captureId;
  if (expected.captureId && captureId !== expected.captureId) {
    throw new Error("The capture conflicts with the milestone record.");
  }
  return { authorizationId: authorization.id!, captureId, merchantId: unit.payee?.merchantId };
}

export function validateCompletedCapture(
  expected: RecoveryExpectation, authorizationId: string, merchantId: string | undefined,
  captureId: string, capture: CapturedPayment,
) {
  const related = capture.supplementaryData?.relatedIds;
  if (capture.id !== captureId || related?.orderId !== expected.orderId || related?.authorizationId !== authorizationId) {
    throw new Error("PayPal capture identifiers could not be independently matched.");
  }
  if (capture.status !== "COMPLETED") throw new Error(`Capture is ${capture.status ?? "unconfirmed"}. The payment remains blocked.`);
  const agreedCents = usdCents(expected.amount);
  if (!agreedCents || capture.amount?.currencyCode !== expected.currency || usdCents(capture.amount?.value) !== agreedCents) {
    throw new Error("The completed capture amount or currency does not match the agreement.");
  }
  if (!merchantId || capture.payee?.merchantId !== merchantId) {
    throw new Error("The receiving merchant could not be matched to the order.");
  }
}
