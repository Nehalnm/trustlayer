import {
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
} from "@paypal/paypal-server-sdk";

import { paypalClient } from "./client";

const ordersController = new OrdersController(paypalClient);
const paymentsController = new PaymentsController(paypalClient);

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
