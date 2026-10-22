import Glyph from "@/components/Glyph";

export default function TrustHero() {
  return <section className="hero-stage relative overflow-hidden border-b border-white/[0.06]">
    <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
    <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-20 sm:px-10 lg:min-h-[760px] lg:grid-cols-[1fr_0.95fr] lg:gap-20 lg:py-28">
      <div className="animate-hero-in">
        <div className="tl-chip mb-8"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />A little more trust. A lot less guesswork.</div>
        <h1 className="max-w-2xl text-[clamp(3.6rem,7vw,6.7rem)] font-medium leading-[1.02] tracking-[-0.075em]">
          Great work.<br /><span className="text-slate-500">Verified.</span><br /><span className="hero-gradient">Then paid.</span>
        </h1>
        <p className="mt-7 max-w-[420px] text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">Turn a freelance agreement into clear milestones. Verify the evidence. Move the money with confidence.</p>
        <div className="mt-9 flex flex-wrap items-center gap-5">
          <a href="#contract" className="tl-btn">Start a project<Glyph name="arrow" className="h-4 w-4" /></a>
          <a href="#how-it-works" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">See how it works<span className="text-slate-600">↗</span></a>
        </div>
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/[0.07] pt-6 text-[11px] font-medium tracking-wide text-slate-500">
          <span className="flex items-center gap-2"><Glyph name="shield" className="h-4 w-4 text-slate-400" />Policy-controlled release</span>
          <span className="flex items-center gap-2"><span className="font-bold italic text-blue-300">PayPal</span>Sandbox integration</span>
        </div>
      </div>
      <div className="animate-hero-panel-in relative mx-auto w-full max-w-[500px]">
        <div className="pointer-events-none absolute -inset-12 rounded-full bg-blue-600/[0.08] blur-3xl" aria-hidden="true" />
        <div className="relative rounded-[24px] border border-white/10 bg-[#15181f] shadow-[0_40px_100px_-30px_#000]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300" /><span className="text-xs font-medium text-slate-300">Trust console</span></div>
            <span className="rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-slate-500">Illustrative example</span>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="tl-eyebrow">Milestone 01</p><h2 className="mt-2 text-xl font-medium tracking-tight">Landing page delivery</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-blue-300"><Glyph name="contract" /></span></div>
            <div className="my-7 flex items-end justify-between border-b border-white/[0.07] pb-7"><div><p className="text-xs text-slate-500">Authorized amount</p><p className="mt-2 text-[44px] font-medium leading-none tracking-[-0.055em]">$500<span className="ml-2 text-xs font-normal tracking-normal text-slate-500">USD</span></p></div><span className="tl-status text-blue-300">Authorized</span></div>
            <p className="tl-eyebrow mb-4">Evidence before action</p>
            <div className="space-y-4">{["Agreed acceptance criteria", "Source evidence recorded", "Deterministic policy checks"].map((label, i) => <div key={label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-3 text-slate-300"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><Glyph name="check" className="h-3 w-3" /></span>{label}</span><span className="font-mono text-[10px] text-slate-600">0{i + 1}</span></div>)}</div>
            <div className="mt-7 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4"><div className="flex items-center gap-2 text-xs font-medium text-emerald-200"><Glyph name="shield" className="h-4 w-4" />AI recommends. Policy validates.</div><p className="mt-2 text-xs leading-5 text-slate-500">PayPal captures only when release conditions pass. Source analysis does not prove visual correctness.</p></div>
          </div>
          <div className="flex items-center justify-between rounded-b-[24px] border-t border-white/[0.07] bg-black/10 px-6 py-4 text-[10px] text-slate-500"><span>WORK → EVIDENCE → PAYMENT</span><span className="font-mono text-emerald-300/60">TRUSTLAYER</span></div>
        </div>
        <div className="absolute -bottom-6 -left-3 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#1b2028] px-5 py-4 shadow-2xl sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/10 text-blue-300"><Glyph name="check" className="h-4 w-4" /></span><div><p className="text-xs font-medium text-slate-200">Built for the agreement.</p><p className="mt-1 text-[10px] text-slate-500">Every criterion. Every milestone.</p></div></div>
      </div>
    </div>
  </section>;
}
