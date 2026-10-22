import Link from "next/link";
import Brand from "@/components/Brand";
import Glyph from "@/components/Glyph";
import ContractBuilder from "@/components/ContractBuilder";
import TrustHero from "@/components/TrustHero";

export default function Home() {
  return <main className="min-h-screen bg-[#0d0f13] text-slate-100">
    <nav className="relative z-10 border-b border-white/[0.06] bg-[#0d0f13]/90" aria-label="Main navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10"><Brand /><div className="hidden items-center gap-8 text-xs text-slate-400 md:flex"><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#trust-model" className="hover:text-white">The trust model</a><Link href="/projects" className="hover:text-white">Workspace</Link></div><Link href="/login" className="tl-btn-secondary text-xs">Sign in <span aria-hidden="true">↗</span></Link></div>
    </nav>
    <TrustHero />
    <section id="how-it-works" className="tl-section scroll-mt-8">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6"><div><p className="tl-eyebrow text-blue-300">Less friction. More certainty.</p><h2 className="mt-4 max-w-xl text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">From “I think it’s done”<br /><span className="text-slate-500">to evidence you can see.</span></h2></div><p className="max-w-sm text-sm leading-7 text-slate-500">Three connected steps. One clear agreement.<br />A payment decision you can explain.</p></div>
      <div className="grid gap-5 md:grid-cols-3">{[
        { number: "01", icon: "contract" as const, title: "Make it measurable.", text: "Describe the work in your own words. AI turns it into milestones, amounts, and clear acceptance criteria.", tag: "THE AGREEMENT" },
        { number: "02", icon: "overview" as const, title: "Look at the evidence.", text: "Submit the actual source. Structural analysis and AI assess each criterion, with results you can inspect.", tag: "THE VERIFICATION" },
        { number: "03", icon: "shield" as const, title: "Release with intention.", text: "Independent rules check the evidence and dispute state before PayPal captures the authorized payment.", tag: "THE PAYMENT" },
      ].map(item => <article key={item.number} className="tl-surface group p-7 sm:p-8"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/[0.06] text-blue-300"><Glyph name={item.icon} /></span><span className="font-mono text-xs text-slate-600">/{item.number}</span></div><p className="tl-eyebrow mt-10 text-[9px]">{item.tag}</p><h3 className="mt-3 text-xl font-medium tracking-tight">{item.title}</h3><p className="mt-4 text-sm leading-7 text-slate-400">{item.text}</p></article>)}</div>
    </section>
    <section id="trust-model" className="border-y border-white/[0.06] bg-[#101318]">
      <div className="tl-section grid gap-12 lg:grid-cols-2 lg:items-center"><div><span className="tl-chip text-emerald-200"><Glyph name="shield" className="h-3.5 w-3.5" />A deliberate trust model</span><h2 className="mt-6 text-3xl font-medium leading-[1.2] tracking-[-0.045em] sm:text-4xl">Intelligent verification.<br /><span className="text-slate-500">Independent payment rules.</span></h2><p className="mt-6 max-w-md text-sm leading-7 text-slate-400">AI makes a recommendation. Deterministic policy checks the release conditions. PayPal executes the payment. Each step has a clear responsibility.</p></div><div className="space-y-3">{[{n:"01",label:"AI recommends",detail:"A structured assessment, with supporting evidence.",color:"text-blue-300"},{n:"02",label:"Policy validates",detail:"Criteria, confidence, artifact integrity, and disputes.",color:"text-violet-300"},{n:"03",label:"PayPal executes",detail:"Capture of an existing payment authorization.",color:"text-emerald-300"}].map(row => <div key={row.n} className="flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-[#15181f] p-6"><span className={`font-mono text-xs ${row.color}`}>{row.n}</span><div className="flex-1"><p className="text-sm font-medium">{row.label}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{row.detail}</p></div><Glyph name="arrow" className={`h-4 w-4 ${row.color}`} /></div>)}</div></div>
    </section>
    <section id="contract" className="tl-section scroll-mt-8"><ContractBuilder /></section>
    <footer className="border-t border-white/[0.07]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-9 sm:px-10"><Brand /><p className="text-xs text-slate-500">Built for the PayPal AI Hackathon · 2026</p><span className="text-[10px] tracking-[0.15em] text-slate-600">WORK BEFORE MONEY.</span></div></footer>
  </main>;
}
