import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ActivityEvent = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ActivityPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: activityEvents } = await supabase
    .from("activity_events")
    .select("*")
    .eq("project_id", id)
    .order("created_at", {
      ascending: false,
    });

  const events = (activityEvents ?? []) as ActivityEvent[];

  return (
    <main
      className="min-h-screen bg-[#f6f5f2] text-slate-950"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-sm text-slate-500">Project activity</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Activity</h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          A record of payments, submissions, verification decisions, disputes,
          and other project events.
        </p>

        <section className="mt-10 border-y border-slate-200">
          {events.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {event.message}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatStatus(event.event_type)}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-slate-500">
              No project activity has been recorded yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
