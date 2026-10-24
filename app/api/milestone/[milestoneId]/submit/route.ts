import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collaborationResponse } from "@/lib/auth/collaboration-response";

export async function POST(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to submit work." }, { status: 401 });
  const { milestoneId } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const content = body?.submissionContent;
  const url = body?.submissionUrl ?? "";
  const notes = body?.notes ?? "";
  if (typeof content !== "string" || content.trim().length < 20 || content.length > 1_000_000 || typeof url !== "string" || url.length > 2048 || typeof notes !== "string" || notes.length > 10000) return NextResponse.json({ error: "Provide deliverable source (20 to 1,000,000 characters), an optional URL, and notes under 10,000 characters." }, { status: 400 });
  if (url.trim()) {
    try { if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: "Use an HTTP or HTTPS submission URL, or leave it blank." }, { status: 400 }); }
  }
  // Ownership, role, version allocation, state, and activity commit atomically.
  return collaborationResponse(await createAdminClient().rpc("submit_project_work", { p_milestone: milestoneId, p_actor: user.id, p_content: content.trim(), p_url: url.trim(), p_notes: notes.trim() }));
}
