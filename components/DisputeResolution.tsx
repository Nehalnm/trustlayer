"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DisputeDetails = { id: string; reason: string; status: string; operation_lock_at: string | null; proposed_by: string | null; proposed_resolution: string | null };

export default function DisputeResolution({ milestoneId, dispute, userId, assigned }: { milestoneId: string; dispute: DisputeDetails | undefined; userId: string; assigned: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function act(action: "propose_revision" | "accept_revision") {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/milestone/${milestoneId}/dispute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save dispute action.");
      setReason(""); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save dispute action."); }
    finally { setPending(false); }
  }
  return <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
    <h6 className="font-semibold text-amber-100">Resolve by agreement</h6>
    {dispute && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{dispute.reason}</p>}
    <p className="mt-3 text-sm leading-6 text-slate-400">Both participants must agree to return to revision. This never captures, refunds, or cancels a PayPal payment. A fresh submission and verification are required afterward.</p>
    {!dispute?.operation_lock_at ? <p className="mt-3 text-sm text-amber-200">This case needs manual reconciliation before the dispute lock can be released.</p> : !assigned ? <p className="mt-3 text-sm text-amber-200">A client and assigned freelancer are required for mutual resolution. Existing single-account disputes need manual review.</p> : dispute.proposed_by ? <>
      <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm">{dispute.proposed_resolution}</p>
      {dispute.proposed_by === userId ? <p role="status" className="mt-3 text-sm text-amber-200">Waiting for the other participant to accept.</p> : <button disabled={pending} onClick={() => act("accept_revision")} className="tl-btn mt-4 disabled:opacity-50">{pending ? "Saving…" : "Accept proposal and return to revision"}</button>}
    </> : <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void act("propose_revision"); }}>
      <label htmlFor={`resolution-${milestoneId}`} className="block text-sm text-slate-300">Describe the revision to agree on</label>
      <textarea id={`resolution-${milestoneId}`} required minLength={10} maxLength={4000} rows={4} value={reason} onChange={event => setReason(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm" />
      <button disabled={pending} type="submit" className="tl-btn disabled:opacity-50">{pending ? "Saving…" : "Propose return to revision"}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </div>;
}
