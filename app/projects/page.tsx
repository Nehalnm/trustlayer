import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOut from "@/components/SignOut";
import Brand from "@/components/Brand";

export const metadata = { title: "Your projects" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: projects, error } = await supabase.from("projects")
    .select("id, title, currency, total_amount, status, created_at")
    .eq("created_by", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your projects. Please retry.");

  return <main className="min-h-screen bg-[#0d0f13] px-5 py-10 text-slate-100 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <nav className="flex items-center justify-between border-b border-white/15 pb-6" aria-label="Account">
        <Brand />
        <SignOut />
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-6 py-12">
        <div><p className="text-xs uppercase tracking-[0.2em] text-[#969eaf]">Your workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Work worth trusting.</h1>
          <p className="mt-4 text-sm text-slate-400">Your agreements, milestone evidence, and payment progress.</p>
        </div>
        <Link href="/#contract" className="tl-btn">Create a project <span aria-hidden="true">+</span></Link>
      </div>
      {projects?.length ? <div className="grid gap-5 md:grid-cols-2">
        {projects.map((project) => <Link key={project.id} href={`/project/${project.id}`} className="tl-surface group p-7 transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4">
          <p className="text-xs uppercase tracking-wide text-[#969eaf]">{project.status.replaceAll("_", " ")}</p>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{project.title}</h2>
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="font-medium">{project.currency} {Number(project.total_amount).toFixed(2)}</span>
            <span className="text-sm text-[#969eaf] group-hover:text-slate-100">Open project →</span>
          </div>
        </Link>)}
      </div> : <section className="border border-white/15 bg-[#171a21] px-8 py-14 text-center">
        <h2 className="text-xl font-semibold">Your first agreement starts here.</h2>
        <p className="mt-3 text-sm text-slate-400">Describe the work to create measurable milestones and acceptance criteria.</p>
        <Link href="/#contract" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Create your first project</Link>
      </section>}
    </div>
  </main>;
}
