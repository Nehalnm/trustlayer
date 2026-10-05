"use client";

import { useState } from "react";

type MilestoneSubmissionProps = {
  milestoneId: string;
};

export default function MilestoneSubmission({
  milestoneId,
}: MilestoneSubmissionProps) {
  const [submissionUrl, setSubmissionUrl] = useState("");

  const [notes, setNotes] = useState("");

  const [submissionContent, setSubmissionContent] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(false);

      if (submissionUrl.trim().length < 5) {
        setError("Please provide a deliverable URL.");
        return;
      }

      if (submissionContent.trim().length < 20) {
        setError("Please provide the actual deliverable content.");
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`/api/milestone/${milestoneId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionUrl: submissionUrl.trim(),
          notes: notes.trim(),
          submissionContent: submissionContent.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit work.");
      }

      setSuccess(true);
      setSubmissionUrl("");
      setNotes("");
      setSubmissionContent("");

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (submitError) {
      console.error("Submission error:", submitError);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit work.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold text-blue-950">Submit completed work</p>

        <p className="mt-1 text-sm leading-6 text-blue-900">
          Provide the deliverable link and the actual work content. TrustLayer
          will compare the submitted work against the agreed milestone
          requirements.
        </p>
      </div>

      <div className="space-y-4">
        {/* Deliverable URL */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-900">
            Deliverable URL
          </label>

          <input
            type="url"
            value={submissionUrl}
            onChange={(event) => setSubmissionUrl(event.target.value)}
            placeholder="https://github.com/your-project"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Deliverable content */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-900">
            Deliverable content
          </label>

          <p className="mb-2 text-xs leading-5 text-slate-500">
            Paste the relevant HTML, CSS, JavaScript, document text, or other
            project content that should be verified.
          </p>

          <textarea
            value={submissionContent}
            onChange={(event) => setSubmissionContent(event.target.value)}
            placeholder="Paste the actual completed work here..."
            rows={10}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-900">
            Submission notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Explain what was completed and anything the reviewer should know."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            submissionUrl.trim().length < 5 ||
            submissionContent.trim().length < 20
          }
          className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Submitting work..." : "Submit for AI verification"}
        </button>

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">✓ Work submitted</p>

            <p className="mt-1">
              TrustLayer is preparing this milestone for AI verification.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Submission failed</p>

            <p className="mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
