import ContractBuilder from "@/components/ContractBuilder";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xl font-bold text-slate-950">TrustLayer</div>

            <div className="text-xs text-slate-500">
              AI-powered transaction protection
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-slate-950">
              How It Works
            </a>

            <a href="#contract" className="transition hover:text-slate-950">
              Create Project
            </a>
          </div>

          <a
            href="#contract"
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              AI + PayPal Payment Protection
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-950 md:text-6xl">
              AI that verifies the work before the money moves.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              TrustLayer turns freelance agreements into structured milestones,
              verifies submitted work against objective requirements, and
              protects milestone payments with PayPal.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contract"
                className="rounded-xl bg-blue-600 px-6 py-3.5 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Create a Protected Project
              </a>

              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span>✓ AI-generated milestones</span>
              <span>✓ PayPal-protected payments</span>
              <span>✓ Objective verification</span>
            </div>
          </div>

          {/* Product Preview */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    TrustLayer Project
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    StudyFlow Landing Page
                  </h2>
                </div>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  IN PROGRESS
                </span>
              </div>

              <div className="mt-7 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Payment Protection
                  </p>

                  <p className="text-sm font-bold text-slate-950">50%</p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-1/2 rounded-full bg-blue-600" />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Payment is released only after the agreed work passes
                  verification.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-emerald-900">
                      ✓ Milestone 1
                    </p>

                    <p className="text-sm font-bold text-emerald-900">FUNDED</p>
                  </div>

                  <p className="mt-1 text-sm text-emerald-800">
                    PayPal payment authorized and protected.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Milestone 2</p>

                    <p className="text-sm font-semibold text-slate-500">
                      PENDING
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    Waiting for milestone funding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              How TrustLayer Works
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Three layers of transaction protection
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              TrustLayer separates understanding the agreement, verifying the
              work, and moving the money.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                01
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-950">
                Understand
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                AI converts a natural-language freelance agreement into
                structured milestones, budgets, deadlines, and measurable
                acceptance criteria.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 font-bold text-purple-700">
                02
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-950">Verify</h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                When work is submitted, AI checks the deliverable against the
                agreed requirements and identifies what passed, failed, or needs
                human review.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-700">
                03
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-950">Release</h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                A deterministic payment policy decides whether the authorized
                PayPal payment can be captured. AI never directly moves the
                money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Model */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Safe Agentic Payments
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                AI recommends. Rules authorize. PayPal executes.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600">
                TrustLayer does not give an AI model direct control over money.
                The model produces a structured verification result, while
                deterministic rules enforce the conditions for releasing a
                payment.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <p className="font-bold text-blue-950">AI Contract Agent</p>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  Converts vague project descriptions into structured,
                  verifiable requirements.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
                <p className="font-bold text-purple-950">
                  AI Verification Agent
                </p>

                <p className="mt-2 text-sm leading-6 text-purple-900">
                  Evaluates submitted work against the milestone criteria.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="font-bold text-emerald-950">
                  Payment Policy Engine
                </p>

                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  Enforces the release conditions before any PayPal
                  authorization is captured.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contract Builder */}
      <section id="contract" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Start a Project
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Turn your agreement into a protected workflow
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Describe the project in normal language. TrustLayer will structure
              the agreement and create milestone-level payment protection.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <ContractBuilder />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TrustLayer. Built for the PayPal AI Hackathon.</p>

          <p>AI verifies the work. Rules protect the payment.</p>
        </div>
      </footer>
    </main>
  );
}
