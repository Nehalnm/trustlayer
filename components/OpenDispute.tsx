"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type OpenDisputeProps = {
  milestoneId: string;
};

export default function OpenDispute({ milestoneId }: OpenDisputeProps) {
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!reason.trim()) {
      setError("Please provide a reason for the dispute.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/milestone/${milestoneId}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open dispute.");
      }

      setReason("");
      setSuccess("Dispute opened successfully.");

      // Automatically update the milestone state.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while opening the dispute.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
          Dispute protection
        </p>

        <h3 className="mt-1 text-xl font-bold text-amber-950">
          Open a dispute
        </h3>

        <p className="mt-2 text-sm text-amber-800">
          Raise a dispute if the submitted work does not match the agreed
          requirements or there is another issue with the milestone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor={`dispute-reason-${milestoneId}`}
            className="mb-2 block text-sm font-semibold text-amber-950"
          >
            Reason
          </label>

          <textarea
            id={`dispute-reason-${milestoneId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why you are opening this dispute..."
            rows={5}
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Opening dispute..." : "Open Dispute"}
        </button>
      </form>
    </div>
  );
}
