import { notFound } from "next/navigation";

import PaymentProtectionBanner from "@/components/PaymentProtectionBanner";
import PayPalCheckout from "@/components/PayPalCheckout";
import ReleasePayment from "@/components/ReleasePayment";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectAccess } from "@/lib/auth/project-access";
import PaymentRecovery from "@/components/PaymentRecovery";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Milestone = {
  id: string;
  title: string;
  amount: number | string;
  deadline_day: number;
  status: string;
  paypal_authorization_id: string | null;
  paypal_capture_id: string | null;
  paypal_order_id: string | null;
  payment_release_locked_at: string | null;
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function PaymentsPage({ params }: PageProps) {
  const { id } = await params;

  await requireProjectAccess(id);

  const supabase = createAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", id)
    .order("deadline_day", {
      ascending: true,
    });

  const projectMilestones = (milestones ?? []) as Milestone[];

  const totalAmount = Number(project.total_amount ?? 0);

  const protectedAmount = projectMilestones
    .filter(
      (milestone) =>
        Boolean(milestone.paypal_authorization_id) ||
        Boolean(milestone.paypal_capture_id),
    )
    .reduce((sum, milestone) => sum + Number(milestone.amount ?? 0), 0);

  return (
    <main
      className="min-h-screen bg-[#0d0f13] text-slate-100"
      style={{ fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-sm text-[#969eaf]">Payments</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Protected project payments
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Payments are authorized milestone by milestone and remain protected
            until the release conditions are satisfied.
          </p>
        </div>

        <PaymentProtectionBanner
          currency={project.currency}
          totalAmount={totalAmount}
          protectedAmount={protectedAmount}
        />

        <section className="mt-10 border border-white/10 bg-[#171a21]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-lg font-semibold">Milestone payments</h2>
          </div>

          <div className="divide-y divide-white/10">
            {projectMilestones.map((milestone) => (
              <div key={milestone.id} className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-semibold">{milestone.title}</h3>

                    <p className="mt-1 text-sm text-[#969eaf]">
                      Due day {milestone.deadline_day}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-[#969eaf]">Amount</p>

                      <p className="mt-1 font-semibold">
                        {project.currency} {Number(milestone.amount).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-[#969eaf]">Status</p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatStatus(milestone.status)}
                      </p>
                    </div>
                  </div>
                </div>

                {milestone.status === "PENDING" && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <PayPalCheckout milestoneId={milestone.id} amount={Number(milestone.amount).toFixed(2)} />
                  </div>
                )}

                {milestone.status === "APPROVED" && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <ReleasePayment milestoneId={milestone.id} locked={Boolean(milestone.payment_release_locked_at)} />
                  </div>
                )}

                {milestone.status === "FUNDED" && (
                  <p className="mt-5 border-t border-white/10 pt-5 text-sm text-emerald-300">
                    Payment authorized through PayPal and protected.
                  </p>
                )}

                {milestone.status === "PAID" && (
                  <p className="mt-5 border-t border-white/10 pt-5 text-sm text-emerald-300">
                    Payment released successfully.
                  </p>
                )}
                {milestone.paypal_order_id && <PaymentRecovery milestoneId={milestone.id} locked={Boolean(milestone.payment_release_locked_at) && milestone.status !== "PAID"} />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
