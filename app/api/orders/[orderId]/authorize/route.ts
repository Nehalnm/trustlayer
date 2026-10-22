import { NextResponse } from "next/server";

// Checkout must be attached to an authenticated milestone.
export async function POST() {
  return NextResponse.json(
    { error: "This legacy endpoint is retired. Use milestone checkout." },
    { status: 410 },
  );
}
