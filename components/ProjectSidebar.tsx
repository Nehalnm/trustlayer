"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";
import Glyph from "@/components/Glyph";

export default function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const links = [
    { label: "Overview", segment: "", icon: "overview" as const },
    { label: "Agreement", segment: "/contract", icon: "contract" as const },
    { label: "Payments", segment: "/payments", icon: "payments" as const },
    { label: "Activity", segment: "/activity", icon: "activity" as const },
  ];
  return <aside className="workspace-sidebar border-b border-white/[0.07] bg-[#101216] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[244px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between gap-4 px-6 py-7 lg:block"><Brand /><Link href="/projects" className="text-xs text-slate-500 transition hover:text-white lg:mt-10 lg:flex lg:items-center lg:gap-2"><span aria-hidden="true">←</span> All projects</Link></div>
    <div className="px-6 pb-3 pt-3 lg:pt-5"><p className="tl-eyebrow text-[9px]">Project workspace</p></div>
    <nav aria-label="Project navigation" className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:gap-1.5 lg:pb-0">
      {links.map(link => { const href = `/project/${projectId}${link.segment}`; const active = pathname === href; return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`group flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition ${active ? "border border-blue-400/10 bg-blue-400/10 font-medium text-blue-200" : "border border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200"}`}><Glyph name={link.icon} className={`h-[18px] w-[18px] ${active ? "text-blue-300" : "text-slate-600 group-hover:text-slate-400"}`} />{link.label}{active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-blue-300 lg:block" />}</Link>; })}
    </nav>
    <div className="mt-auto hidden p-5 lg:block"><div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"><Glyph name="shield" className="mb-3 h-5 w-5 text-emerald-300/80" /><p className="text-xs font-medium text-slate-300">Evidence before payment.</p><p className="mt-2 text-[11px] leading-5 text-slate-600">AI recommends.<br />Policy validates. PayPal executes.</p><span className="mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-widest text-slate-500"><span className="h-1 w-1 rounded-full bg-amber-300" />Sandbox demo</span></div><Link href="/projects" className="mt-5 flex items-center gap-3 rounded-xl px-2 py-2 text-xs text-slate-500 hover:text-slate-200"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300">TL</span><span>Your workspace<span className="mt-0.5 block text-[10px] text-slate-600">Manage projects ↗</span></span></Link></div>
  </aside>;
}
