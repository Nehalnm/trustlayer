import PayPalCheckout from "@/components/PayPalCheckout";
import ContractBuilder from "@/components/ContractBuilder";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
        <div className="text-2xl font-bold tracking-tight">
          Trust<span className="text-blue-600">Layer</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            How it works
          </button>

          <button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-8 pb-20 pt-24">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            AI-powered freelance payments
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            AI that verifies the work
            <span className="block text-blue-600">before the money moves.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            TrustLayer turns freelance agreements into measurable milestones,
            verifies deliverables against the agreed requirements, and helps
            manage milestone payments through PayPal.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-sm hover:bg-blue-700">
              Create a Project
            </button>

            <button className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">
              See How It Works
            </button>
          </div>
          <div className="mt-8 max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Sandbox payment test
            </p>

            <p className="mt-1 text-xl font-bold">Protect $9.99</p>

            <p className="mt-2 mb-5 text-sm text-slate-500">
              Test the TrustLayer payment flow using PayPal Sandbox.
            </p>

            <PayPalCheckout />
          </div>
        </div>

        {/* Demo card */}
        <div className="mt-20 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Project
              </p>

              <h2 className="mt-1 text-2xl font-bold">Acme Landing Page</h2>
            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              Payment Protected
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total Project</p>
              <p className="mt-2 text-2xl font-bold">$300</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Milestones</p>
              <p className="mt-2 text-2xl font-bold">3</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">AI Verification</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">Active</p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="mb-4 text-sm font-semibold text-slate-500">
              Agent Activity
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />

                <div className="flex-1">
                  <p className="font-medium">Contract created</p>
                  <p className="text-sm text-slate-500">
                    AI generated milestones and acceptance criteria
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-blue-500" />

                <div className="flex-1">
                  <p className="font-medium">Deliverable submitted</p>
                  <p className="text-sm text-slate-500">
                    AI verification in progress
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-amber-500" />

                <div className="flex-1">
                  <p className="font-medium">Waiting for verification</p>
                  <p className="text-sm text-slate-500">
                    Payment remains protected until requirements are satisfied
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContractBuilder />

      {/* Features */}
      <section className="border-t border-slate-200 bg-white px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              The TrustLayer model
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              AI decides. Rules protect. PayPal executes.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-xl font-bold">Understand</h3>

              <p className="mt-3 leading-7 text-slate-600">
                Turn a natural-language freelance request into structured
                milestones and clear acceptance criteria.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-xl font-bold">Verify</h3>

              <p className="mt-3 leading-7 text-slate-600">
                Compare submitted work against what the client and freelancer
                actually agreed upon.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-xl font-bold">Release</h3>

              <p className="mt-3 leading-7 text-slate-600">
                Release milestone payments through PayPal only when the agreed
                conditions are satisfied.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
