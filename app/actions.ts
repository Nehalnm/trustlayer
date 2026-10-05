"use server";

import { createPayPalOrder, capturePayPalOrder } from "@/lib/paypal/orders";

export async function createOrder(): Promise<{ id: string }> {
  const orderId = await createPayPalOrder("9.99");

  return {
    id: orderId,
  };
}

export async function captureOrder(orderId: string) {
  return capturePayPalOrder(orderId);
}
