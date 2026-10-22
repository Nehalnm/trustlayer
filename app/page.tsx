import ContractBuilder from "@/components/ContractBuilder";
import TrustHero from "@/components/TrustHero";
import Link from "next/link";

function WorkflowRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-4 border-b border-slate-200 py-7 sm:grid-cols-[64px_180px_1fr] sm:items-start">
      <div className="text-sm font-medium text-slate-400">{number}</div>

      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="max-w-xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f1eb] text-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-[#101827] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#" className="text-xl font-semibold tracking-tight">
            TrustLayer
          </a>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <Link href="/projects" className="transition hover:text-white">My projects</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>

            <a href="#trust-model" className="transition hover:text-white">
              Trust model
            </a>

            <a href="#contract" className="transition hover:text-white">
              Create project
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <TrustHero />

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-[#f4f1eb]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500">
              How TrustLayer works
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Separate the work from the payment decision.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              TrustLayer handles three different jobs independently:
              understanding the agreement, checking the work, and deciding
              whether the payment can move.
            </p>
          </div>

          <div className="mt-10 border-t border-slate-200">
            <WorkflowRow
              number="01"
              title="Understand"
              description="AI turns a natural-language freelance agreement into structured milestones, budgets, deadlines, and objective acceptance criteria."
            />

            <WorkflowRow
              number="02"
              title="Verify"
              description="When the freelancer submits work, AI compares the actual deliverable with the agreed requirements and records what passed, failed, or needs review."
            />

            <WorkflowRow
              number="03"
              title="Release"
              description="A deterministic payment policy checks the verification result, authorization, and dispute state before an authorized PayPal payment can be captured."
            />
          </div>
        </div>
      </section>

      {/* Trust model */}
      <section
        id="trust-model"
        className="border-b border-slate-200 bg-[#101827] text-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm text-slate-400">The trust model</p>

              <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                AI recommends. Rules authorize. PayPal executes.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                TrustLayer does not give an AI model direct control over money.
                The model produces a structured verification result, while
                deterministic rules enforce the conditions required for payment
                release.
              </p>
            </div>

            <div className="border-t border-slate-700">
              <div className="grid gap-0 sm:grid-cols-3">
                <div className="border-b border-slate-700 py-6 sm:border-b-0 sm:border-r sm:pr-6">
                  <p className="text-sm font-semibold">Contract agent</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Structures the agreement and identifies measurable
                    requirements.
                  </p>
                </div>

                <div className="border-b border-slate-700 py-6 sm:border-b-0 sm:px-6 sm:border-r">
                  <p className="text-sm font-semibold">Verification agent</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Evaluates the submitted work against those requirements.
                  </p>
                </div>

                <div className="py-6 sm:pl-6">
                  <p className="text-sm font-semibold">Payment policy</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Enforces the conditions before PayPal capture can occur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contract builder */}
      <section id="contract" className="border-b border-slate-200 bg-[#f4f1eb]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500">
              Start a project
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Turn an agreement into a protected workflow.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Describe the project in normal language. TrustLayer structures the
              agreement and creates milestone-level payment protection.
            </p>
          </div>

          <div className="mt-10 border border-slate-300 bg-white p-5 sm:p-8">
            <ContractBuilder />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#101827] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 TrustLayer. Built for the PayPal AI Hackathon.</p>

          <p className="text-slate-500">
            AI verifies the work. Rules protect the payment.
          </p>
        </div>
      </footer>
    </main>
  );
}
