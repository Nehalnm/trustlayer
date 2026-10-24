import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collaborationResponse } from "@/lib/auth/collaboration-response";

export async function POST(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to manage disputes." }, { status: 401 });
  const { milestoneId } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const action = body?.action ?? "open";
  if (!["open", "propose_revision", "accept_revision"].includes(action)) return NextResponse.json({ error: "Unknown dispute action." }, { status: 400 });
  const reason = body?.reason ?? "";
  if (typeof reason !== "string" || reason.length > 4000 || (action !== "accept_revision" && reason.trim().length < 10)) return NextResponse.json({ error: "Provide a reason between 10 and 4000 characters." }, { status: 400 });
  const { data: milestone, error } = await client.from("milestones").select("id").eq("id", milestoneId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not verify milestone access." }, { status: 500 });
  if (!milestone) return NextResponse.json({ error: "Milestone not found or inaccessible." }, { status: 403 });
  // Actor identity is authenticated here and rechecked under database row locks.
  return collaborationResponse(await createAdminClient().rpc("milestone_dispute_action", { p_milestone: milestoneId, p_actor: user.id, p_action: action, p_reason: reason.trim() }));
}
