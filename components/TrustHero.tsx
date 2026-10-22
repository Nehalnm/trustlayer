export default function TrustHero() {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#08111f] text-white">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute left-[-10%] top-[-15%] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* Top edge */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid w-full gap-16 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
          {/* LEFT */}
          <div className="animate-hero-in">
            <div className="mb-7 inline-flex items-center gap-3 border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              AI verification × PayPal payments
            </div>

            <h1 className="max-w-4xl text-[clamp(3.7rem,7vw,7rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              <span className="block">Work first.</span>
              <span className="block text-slate-400">Money second.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              TrustLayer verifies the work against what was agreed before PayPal
              releases what was paid.
            </p>

            {/* ONE PRIMARY ACTION */}
            <div className="mt-9">
              <a
                href="#contract"
                className="group inline-flex items-center justify-center gap-3 bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-200"
              >
                Create a protected project
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-500">
              <span>Objective requirements</span>
              <span>Evidence-based verification</span>
              <span>Deterministic payment policy</span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="animate-hero-panel-in relative">
            <div className="relative overflow-hidden border border-white/10 bg-white/[0.025] p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-6">
              {/* Soft scanning glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-trust-scan bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/[0.055] via-transparent to-cyan-300/[0.04]" />

              <div className="relative">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
                      TrustLayer payment
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-200">
                      Website redesign
                    </p>
                  </div>

                  {/* PayPal */}
                  <div className="flex items-center gap-2 border border-white/10 bg-white px-3 py-2">
                    <img
                      src="https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg"
                      alt="PayPal"
                      className="h-5 w-auto"
                    />
                  </div>
                </div>

                {/* AMOUNT */}
                <div className="py-8">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Protected payment
                      </p>

                      <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
                        $500
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Milestone</p>

                      <p className="mt-1 text-sm text-slate-300">01 / 03</p>
                    </div>
                  </div>
                </div>

                {/* PAYMENT STATE */}
                <div className="border border-white/10 bg-[#0b1626]/90 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Payment state
                    </p>

                    <span className="animate-trust-pulse text-[10px] tracking-wider text-blue-300">
                      LIVE
                    </span>
                  </div>

                  <div className="mt-6 space-y-2">
                    {/* 01 */}
                    <div className="animate-trust-state-1 border border-blue-400/20 bg-blue-400/[0.035] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-blue-400/30 bg-blue-400/10 text-xs text-blue-300">
                          01
                        </div>

                        <div className="flex min-w-0 flex-1 items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              Payment authorized
                            </p>

                            <p className="mt-1 text-[10px] text-slate-500">
                              Authorization secured
                            </p>
                          </div>

                          <span className="text-[10px] font-medium tracking-wider text-blue-300">
                            PAYPAL
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 02 */}
                    <div className="animate-trust-state-2 border border-white/10 bg-white/[0.015] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-blue-400/20 bg-blue-400/[0.06] text-xs text-blue-300">
                          02
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">
                                Work verified
                              </p>

                              <p className="mt-1 text-[10px] text-slate-500">
                                Evidence matched to requirements
                              </p>
                            </div>

                            <span className="text-[10px] tracking-wider text-slate-500">
                              AI
                            </span>
                          </div>

                          <div className="mt-3 flex gap-1.5">
                            <span className="animate-trust-bar-1 h-1 flex-1 bg-emerald-400/80" />
                            <span className="animate-trust-bar-2 h-1 flex-1 bg-emerald-400/80" />
                            <span className="animate-trust-bar-3 h-1 flex-1 bg-emerald-400/80" />
                            <span className="animate-trust-bar-4 h-1 flex-1 bg-emerald-400/80" />
                            <span className="animate-trust-bar-5 h-1 flex-1 bg-emerald-400/80" />
                          </div>

                          <div className="mt-2 flex justify-between text-[10px]">
                            <span className="text-slate-500">
                              5 / 5 requirements
                            </span>

                            <span className="text-emerald-300">TRUST 96</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 03 */}
                    <div className="animate-trust-state-3 border border-emerald-400/15 bg-emerald-400/[0.025] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-emerald-400/25 bg-emerald-400/[0.07] text-xs text-emerald-300">
                          03
                        </div>

                        <div className="flex min-w-0 flex-1 items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              Payment released
                            </p>

                            <p className="mt-1 text-[10px] text-slate-500">
                              Policy eligible
                            </p>
                          </div>

                          <span className="text-[10px] tracking-wider text-emerald-300">
                            READY
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EVIDENCE */}
                <div className="mt-3 border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        Evidence
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Multiple signals support the decision
                      </p>
                    </div>

                    <span className="animate-trust-dot h-1.5 w-1.5 rounded-full bg-blue-400" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="border border-white/10 px-3 py-2.5 transition-colors duration-300 hover:border-blue-400/30">
                      <p className="text-[9px] text-slate-600">SOURCE</p>
                      <p className="mt-1 text-xs text-slate-300">HTML / CSS</p>
                    </div>

                    <div className="border border-white/10 px-3 py-2.5 transition-colors duration-300 hover:border-blue-400/30">
                      <p className="text-[9px] text-slate-600">DOM</p>
                      <p className="mt-1 text-xs text-slate-300">3 plans</p>
                    </div>

                    <div className="border border-white/10 px-3 py-2.5 transition-colors duration-300 hover:border-blue-400/30">
                      <p className="text-[9px] text-slate-600">VISUAL</p>
                      <p className="mt-1 text-xs text-slate-300">Verified</p>
                    </div>
                  </div>
                </div>

                {/* POLICY */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">
                      Trust policy
                    </p>

                    <p className="mt-1 text-xs text-slate-300">
                      AI recommends · Rules validate
                    </p>
                  </div>

                  <div className="border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">
                      Decision
                    </p>

                    <p className="mt-1 text-xs text-emerald-300">
                      Payment eligible
                    </p>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-[10px] uppercase tracking-widest text-slate-600">
                    Payment execution
                  </span>

                  <div className="flex items-center gap-2">
                    <img
                      src="https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg"
                      alt="PayPal"
                      className="h-4 w-auto"
                    />

                    <span className="text-xs text-slate-500">$500</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supporting caption */}
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600">
              <span>AI recommends</span>
              <span>Policy validates</span>
              <span>PayPal executes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
