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

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-7 border-t border-slate-200 pt-7">
      <div className="mb-6">
        <p className="text-lg font-semibold tracking-tight text-slate-950">
          Submit your deliverable
        </p>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Submit the completed work. TrustLayer will compare it with the
          milestone requirements before payment can be released.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor={`submission-url-${milestoneId}`}
            className="mb-2 block text-sm font-medium text-slate-800"
          >
            Submission URL
          </label>

          <input
            id={`submission-url-${milestoneId}`}
            type="url"
            value={submissionUrl}
            onChange={(event) => setSubmissionUrl(event.target.value)}
            placeholder="https://github.com/..."
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor={`submission-content-${milestoneId}`}
            className="mb-2 block text-sm font-medium text-slate-800"
          >
            Deliverable content
          </label>

          <textarea
            id={`submission-content-${milestoneId}`}
            value={submissionContent}
            onChange={(event) => setSubmissionContent(event.target.value)}
            placeholder="Paste or describe the actual deliverable..."
            rows={8}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor={`submission-notes-${milestoneId}`}
            className="mb-2 block text-sm font-medium text-slate-800"
          >
            Notes
          </label>

          <textarea
            id={`submission-notes-${milestoneId}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything the client or verifier should know..."
            rows={3}
            className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        {error && (
          <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit for verification"}
          </button>
        </div>
      </form>
    </section>
  );
}
