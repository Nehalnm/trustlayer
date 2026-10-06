"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReleasePaymentProps = {
  milestoneId: string;
};

export default function ReleasePayment({ milestoneId }: ReleasePaymentProps) {
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
    <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Payment release
        </p>

        <h3 className="mt-1 text-xl font-bold text-emerald-950">
          Release milestone payment
        </h3>

        <p className="mt-2 text-sm text-emerald-800">
          TrustLayer will evaluate the payment policy before capturing the
          authorized PayPal payment.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">
          Payment protection
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Payment is released only when the milestone has been approved, all
          acceptance criteria have passed, verification confidence is
          sufficient, the PayPal authorization exists, and there is no open
          dispute.
        </p>
      </div>

      <button
        type="button"
        onClick={handleRelease}
        disabled={isReleasing}
        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isReleasing ? "Releasing payment..." : "Release Payment"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}
    </div>
  );
}
