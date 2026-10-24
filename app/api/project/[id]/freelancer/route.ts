import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to assign a freelancer." }, { status: 401 });
  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (typeof body?.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json({ error: "Enter the freelancer's registered email address." }, { status: 400 });
  }
  const { data: project, error } = await client.from("projects").select("id").eq("id", id).eq("created_by", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not verify project access." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Only the client can assign a freelancer." }, { status: 403 });
  const admin = createAdminClient();
  let freelancerId: string | null = null;
  for (let page = 1; ; page++) {
    const lookup = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (lookup.error) return NextResponse.json({ error: "Could not look up the freelancer account." }, { status: 500 });
    const match = lookup.data.users.find(account => account.email?.toLowerCase() === body.email.trim().toLowerCase());
    if (match) {
      if (match.email_confirmed_at) freelancerId = match.id;
      break;
    }
    if (lookup.data.users.length < 1000) break;
  }
  if (!freelancerId || freelancerId === user.id) return NextResponse.json({ error: "Choose a different, confirmed TrustLayer account." }, { status: 409 });
  const result = await admin.rpc("assign_project_freelancer", { p_project: id, p_actor: user.id, p_freelancer: freelancerId });
  if (result.error) return NextResponse.json({ error: ["P0001", "42501", "22023"].includes(result.error.code) ? result.error.message : "Could not assign the freelancer." }, { status: result.error.code === "42501" ? 403 : 409 });
  return NextResponse.json(result.data);
}
