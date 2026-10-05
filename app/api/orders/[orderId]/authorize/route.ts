import { NextResponse } from "next/server";
import { authorizePayPalOrder } from "@/lib/paypal/orders";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ orderId: string }>;
  },
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing PayPal order ID" },
        { status: 400 },
      );
    }

    const result = await authorizePayPalOrder(orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("PayPal authorization error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to authorize PayPal order",
      },
      { status: 500 },
    );
  }
}
