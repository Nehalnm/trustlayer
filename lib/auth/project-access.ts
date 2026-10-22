import "server-only";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Run in every data-loading page; a layout alone is not a data boundary. */
export async function requireProjectAccess(projectId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, created_by")
    .eq("id", projectId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (error) throw new Error("Could not verify project access.");
  if (!project) notFound();

  return { user, project };
}
