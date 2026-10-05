import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal/orders";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing PayPal order ID" },
        { status: 400 },
      );
    }

    const result = await capturePayPalOrder(orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("PayPal capture error:", error);

    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 },
    );
  }
}
