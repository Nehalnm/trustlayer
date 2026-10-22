"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReleasePaymentProps = {
  milestoneId: string;
  locked?: boolean;
};

export default function ReleasePayment({ milestoneId, locked = false }: ReleasePaymentProps) {
  const router = useRouter();

  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRelease() {
    setIsReleasing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/milestone/${milestoneId}/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const reasons = Array.isArray(data.reasons)
          ? data.reasons.join(" ")
          : "";

        throw new Error(data.error || reasons || "Payment release failed.");
      }

      setSuccess("Payment released successfully.");

      // Refresh the server-rendered milestone/project state.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while releasing the payment.",
      );
    } finally {
      setIsReleasing(false);
    }
  }

  return (
    <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-300">
          Payment release
        </p>

        <h3 className="mt-1 text-xl font-bold text-emerald-100">
          Release milestone payment
        </h3>

        <p className="mt-2 text-sm text-emerald-200">
          TrustLayer will evaluate the payment policy before capturing the
          authorized PayPal payment.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-emerald-400/20 bg-[#171a21] p-4">
        <p className="text-sm font-semibold text-slate-100">
          Payment protection
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          Payment is released only when the milestone has been approved, all
          acceptance criteria have passed, verification confidence is
          sufficient, the PayPal authorization exists, and there is no open
          dispute.
        </p>
      </div>

      <button
        type="button"
        onClick={handleRelease}
        disabled={isReleasing || locked}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {locked ? "Release paused for review" : isReleasing ? "Releasing payment..." : "Release payment"}
      </button>
      {locked && <p className="mt-3 text-xs leading-6 text-amber-200">A previous operation needs review. Check PayPal status before taking further action.</p>}

      {error && (
        <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-[#171a21] px-4 py-3 text-sm font-medium text-emerald-300">
          {success}
        </div>
      )}
    </div>
  );
}
