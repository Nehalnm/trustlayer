"use client";

import { useState } from "react";

type ReleasePaymentProps = {
  milestoneId: string;
};

export default function ReleasePayment({ milestoneId }: ReleasePaymentProps) {
  const [isReleasing, setIsReleasing] = useState(false);

  const [released, setReleased] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    try {
      setError(null);
      setIsReleasing(true);

      const response = await fetch(`/api/milestone/${milestoneId}/release`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const reasons = Array.isArray(data?.reasons)
          ? data.reasons.join(" ")
          : null;

        throw new Error(reasons || data?.error || "Payment release failed.");
      }

      if (!data?.released) {
        throw new Error("Payment was not released.");
      }

      setReleased(true);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (releaseError) {
      console.error("Payment release error:", releaseError);

      setError(
        releaseError instanceof Error
          ? releaseError.message
          : "Payment release failed.",
      );
    } finally {
      setIsReleasing(false);
    }
  };

  if (released) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="font-semibold text-emerald-900">✓ Payment released</p>

        <p className="mt-1 text-sm leading-6 text-emerald-800">
          The approved milestone payment has been captured through PayPal.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleRelease}
        disabled={isReleasing}
        className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isReleasing ? "Releasing payment..." : "Release milestone payment"}
      </button>

      <p className="mt-2 text-center text-xs text-slate-500">
        TrustLayer will verify the payment policy before capturing the PayPal
        authorization.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Payment release blocked</p>

          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
