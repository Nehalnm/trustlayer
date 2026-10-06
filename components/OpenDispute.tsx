"use client";

import { useState } from "react";

type OpenDisputeProps = {
  milestoneId: string;
};

export default function OpenDispute({ milestoneId }: OpenDisputeProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);

      if (reason.trim().length < 10) {
        setError("Please explain the dispute in at least 10 characters.");
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`/api/milestone/${milestoneId}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to open dispute.");
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (disputeError) {
      console.error("Dispute error:", disputeError);

      setError(
        disputeError instanceof Error
          ? disputeError.message
          : "Failed to open dispute.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="font-semibold text-red-900">✓ Dispute opened</p>

        <p className="mt-1 text-sm leading-6 text-red-800">
          Payment release is now blocked while the dispute is being reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="mb-4">
        <p className="text-sm font-bold text-red-950">Open a dispute</p>

        <p className="mt-1 text-sm leading-6 text-red-900">
          Use this when the deliverable, scope, or AI verification needs human
          review.
        </p>
      </div>

      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Describe why this milestone should be disputed..."
        rows={4}
        className="w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || reason.trim().length < 10}
        className="mt-4 w-full rounded-xl bg-red-600 px-5 py-3.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Opening dispute..." : "Open dispute"}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Dispute failed</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
