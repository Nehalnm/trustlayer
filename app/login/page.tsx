"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Brand from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) {
          throw authError;
        }

        if (data.session) {
          router.replace("/projects");
          router.refresh();
          return;
        }

        setMessage(
          "Account created. Check your email to confirm your account, then sign in.",
        );
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw authError;
        }

        router.replace("/projects");
        router.refresh();
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d19] px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          ← Back to TrustLayer
        </Link>

        <div className="tl-surface mt-8 p-7 sm:p-9">
          <div className="mb-8"><Brand /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
            TrustLayer
          </p>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {isSignUp
              ? "Create an account to manage projects and protected payments."
              : "Sign in to manage your projects and payment milestones."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-300"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-slate-400">
            {isSignUp ? "Already have an account? " : "New to TrustLayer? "}

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setMessage("");
              }}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#969eaf]">
          AI verifies the work. Policy validates the release. PayPal executes
          the payment.
        </p>
      </div>
    </main>
  );
}
