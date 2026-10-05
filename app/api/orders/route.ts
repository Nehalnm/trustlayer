import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal/orders";

export async function POST() {
  try {
    const orderId = await createPayPalOrder("9.99");

    return NextResponse.json({ id: orderId });
  } catch (error) {
    console.error("PayPal create order error:", error);

    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 },
    );
  }
}
