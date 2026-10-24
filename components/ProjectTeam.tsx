"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ProjectTeam({ projectId, role, assigned }: { projectId: string; role: "CLIENT" | "FREELANCER"; assigned: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function assign(event: FormEvent) {
    event.preventDefault();
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/project/${projectId}/freelancer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assignment failed.");
      setEmail(""); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Assignment failed."); }
    finally { setPending(false); }
  }
  return <section className="tl-surface mb-8 p-6" aria-labelledby="project-team-title">
    <p className="tl-eyebrow">Project team</p>
    <h2 id="project-team-title" className="mt-2 text-lg font-semibold">Your role: {role === "CLIENT" ? "Client" : "Freelancer"}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">{assigned ? "The freelancer submits work. The client runs verification and manages PayPal payments. Both participants can raise and resolve disputes by agreement." : "Single-account demo: you can submit sample work until you assign a freelancer. Assignment gives that account access to the project, evidence, and payment history."}</p>
    {role === "CLIENT" && !assigned && <form onSubmit={assign} className="mt-5 max-w-xl space-y-3">
      <label htmlFor="freelancer-email" className="block text-sm text-slate-300">Freelancer’s registered email</label>
      <input id="freelancer-email" type="email" required maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" />
      <p className="text-xs leading-5 text-slate-400">Use a confirmed account belonging to your collaborator. Assignment is permanent in this version; the client can no longer submit work after assignment.</p>
      <button type="submit" disabled={pending} className="tl-btn disabled:opacity-50">{pending ? "Assigning…" : "Assign freelancer and share project"}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>;
}
