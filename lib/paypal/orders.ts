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

export async function captureAuthorizedPayPalPayment(authorizationId: string) {
  const { result } = await paymentsController.captureAuthorizedPayment({
    authorizationId,
    prefer: "return=representation",
  });

  if (!result) {
    throw new Error("PayPal authorized payment capture failed.");
  }

  return result;
}
