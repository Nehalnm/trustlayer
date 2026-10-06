"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type MilestoneSubmissionProps = {
  milestoneId: string;
};

export default function MilestoneSubmission({
  milestoneId,
}: MilestoneSubmissionProps) {
  const router = useRouter();

  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionContent, setSubmissionContent] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!submissionUrl.trim() && !submissionContent.trim()) {
      setError("Please provide a submission URL or deliverable content.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/milestone/${milestoneId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionUrl: submissionUrl.trim(),
          submissionContent: submissionContent.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit work.");
      }

      setSuccess("Work submitted successfully.");

      setSubmissionUrl("");
      setSubmissionContent("");
      setNotes("");

      // Refresh the server-rendered milestone state automatically.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-6">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
          Submit work
        </p>

        <h3 className="mt-1 text-xl font-bold text-blue-950">
          Submit your deliverable
        </h3>

        <p className="mt-2 text-sm text-blue-800">
          Provide a link to the work and/or the actual deliverable content.
          TrustLayer will verify it against the milestone acceptance criteria.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor={`submission-url-${milestoneId}`}
            className="mb-2 block text-sm font-semibold text-blue-950"
          >
            Submission URL
          </label>

          <input
            id={`submission-url-${milestoneId}`}
            type="url"
            value={submissionUrl}
            onChange={(event) => setSubmissionUrl(event.target.value)}
            placeholder="https://github.com/..."
            className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label
            htmlFor={`submission-content-${milestoneId}`}
            className="mb-2 block text-sm font-semibold text-blue-950"
          >
            Deliverable content
          </label>

          <textarea
            id={`submission-content-${milestoneId}`}
            value={submissionContent}
            onChange={(event) => setSubmissionContent(event.target.value)}
            placeholder="Describe or paste the actual deliverable here..."
            rows={10}
            className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          <p className="mt-2 text-xs text-blue-700">
            Include the actual work or enough detail for the AI verifier to
            evaluate the acceptance criteria.
          </p>
        </div>

        <div>
          <label
            htmlFor={`submission-notes-${milestoneId}`}
            className="mb-2 block text-sm font-semibold text-blue-950"
          >
            Notes
          </label>

          <textarea
            id={`submission-notes-${milestoneId}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any relevant notes for the client or verifier..."
            rows={4}
            className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit Work"}
        </button>
      </form>
    </div>
  );
}
