"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Please retry.");
      setBusy(false);
    }
  }

  return <div>
    <button onClick={signOut} disabled={busy} className="border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
      {busy ? "Signing out…" : "Sign out"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
