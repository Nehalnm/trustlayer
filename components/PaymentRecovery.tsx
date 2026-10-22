"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Glyph from "@/components/Glyph";

export default function PaymentRecovery({ milestoneId, locked = false }: { milestoneId: string; locked?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function check() {
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/milestone/${milestoneId}/reconcile`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check payment status.");
      setMessage(result.message);
      if (result.reconciled) router.refresh();
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "Could not check payment status.");
    } finally { setBusy(false); }
  }
  return <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Glyph name="activity" className={`h-4 w-4 ${locked ? "text-amber-300" : "text-slate-500"}`} /><div><p className="text-xs font-medium text-slate-300">{locked ? "Payment review required" : "Need to confirm the payment?"}</p><p className="mt-1 text-[10px] text-slate-500">Checks existing PayPal records. Does not charge or release funds.</p></div></div><button type="button" onClick={check} disabled={busy} className="tl-btn-secondary disabled:opacity-50">{busy ? "Checking…" : "Check PayPal status"}</button></div>
    {message && <p role={error ? "alert" : "status"} className={`mt-4 text-xs leading-6 ${error ? "text-amber-200" : "text-slate-400"}`}>{message}</p>}
  </div>;
}
