import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/** Both capture responses and webhooks must finish project state. Safe to retry. */
export async function completeProjectIfPaid(
  supabase: ReturnType<typeof createAdminClient>, projectId: string,
) {
  const { data: milestones, error } = await supabase
    .from("milestones").select("status").eq("project_id", projectId);
  if (error) throw new Error("Could not check project completion.");
  if (!milestones?.length || !milestones.every((item) => item.status === "PAID")) return false;

  const { error: updateError } = await supabase
    .from("projects").update({ status: "COMPLETED" }).eq("id", projectId);
  if (updateError) throw new Error("Payment is complete, but project state requires reconciliation.");
  return true;
}
