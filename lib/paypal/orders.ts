import {
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
} from "@paypal/paypal-server-sdk";

import { paypalClient } from "./client";

const ordersController = new OrdersController(paypalClient);
const paymentsController = new PaymentsController(paypalClient);

// GET-only reads used by reconciliation; these never authorize or capture funds.
export async function getPayPalOrder(orderId: string) {
  const { result } = await ordersController.getOrder({ id: orderId });
  return result;
}

export async function getPayPalCapture(captureId: string) {
  const { result } = await paymentsController.getCapturedPayment({ captureId });
  return result;
}

export async function getPayPalAuthorization(authorizationId: string) {
  const { result } = await paymentsController.getAuthorizedPayment({ authorizationId });
  return result;
}

export async function createPayPalOrder(amount: string): Promise<string> {
  const { result } = await ordersController.createOrder({
    body: {
      intent: CheckoutPaymentIntent.Authorize,
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: amount,
          },
        },
      ],
    },
  });

  if (!result.id) {
    throw new Error("PayPal order creation failed: missing order ID");
  }

  return result.id;
}

export async function authorizePayPalOrder(orderId: string) {
  const { result } = await ordersController.authorizeOrder({
    id: orderId,
    prefer: "return=representation",
  });

  if (!result) {
    throw new Error("PayPal authorization failed.");
  }

  return result;
}

export async function captureAuthorizedPayPalPayment(
  authorizationId: string,
  requestId: string,
) {
  if (!authorizationId.trim()) {
    throw new Error("Missing PayPal authorization ID.");
  }

  if (!requestId.trim() || requestId.length > 100) {
    throw new Error("A valid PayPal idempotency key is required.");
  }

  const { result } = await paymentsController.captureAuthorizedPayment({
    authorizationId,
    paypalRequestId: requestId,
    prefer: "return=representation",
  });

  if (!result) {
    throw new Error("PayPal authorized payment capture failed.");
  }

  return result;
}
