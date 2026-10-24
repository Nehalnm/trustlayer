import { NextResponse } from "next/server";

export function collaborationResponse(result: { data: unknown; error: { code: string; message: string } | null }) {
  if (!result.error) return NextResponse.json(result.data);
  const { code, message } = result.error;
  const status = code === "42501" ? 403 : code === "22023" ? 400 : code === "P0001" ? 409 : 500;
  return NextResponse.json({ error: ["42501", "22023", "P0001"].includes(code) ? message : "The operation could not be saved. No partial changes were committed." }, { status });
}
