"use client";

// /my-submissions — the student's own submissions and their status.
// PDF preview part: View opens the preview window instead of a new tab.
// Part 12: hard-coded colours switched to the theme colours.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { rejectionReasonLabel } from "@/lib/rejectionReasons";
import { resourceTypeLabel } from "@/lib/resourceTypes";

// One row from resource_submissions, plus the programme name joined in.
type Submission = {
  id: number;
  title: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  file_path: string;
  created_at: string;
  reviewed_at: string | null;
  programmes: { name: string } | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

// Colours and wording for each status, kept in one place.
const STATUS_STYLES = {
  pending: { label: "Pending review", className: "bg-gold-tint text-gold-ink" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

// "2026-10-07T16:20:00Z" -> "7 Oct 2026"
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MySubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const savedNotice = sessionStorage.getItem("novelle:upload-notice");

    if (savedNotice) {
      setNotice(savedNotice);
      sessionStorage.removeItem("novelle:upload-notice");

      const timeout = window.setTimeout(() => setNotice(""), 8000);
      loadSubmissions();
      return () => window.clearTimeout(timeout);
    }

    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    setError("");

    // Not logged in -> send to login (same guard as /home).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // programmes(name) follows the programme_id foreign key and
    // brings back the programme's name in the same request.
    //
    // .eq("submitted_by", user.id) is needed even with the new RLS policy:
    // policies are OR-ed, so an ADMIN would also see other students'
    // submissions here. This keeps the page "mine only" for everyone.
    const { data, error } = await supabase
      .from("resource_submissions")
      .select(
        "id, title, type, status, rejection_reason, file_path, created_at, reviewed_at, programmes(name)"
      )
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("Load submissions error:", error);
      setError("Could not load your submissions.");
    } else {
      setSubmissions((data ?? []) as unknown as Submission[]);
    }

    setLoading(false);
  }

  // Open the student's own PDF in the preview window. Allowed by the
  // storage policy from migration 002 (files in submissions/<their-id>/).
  const { openPdf } = usePreview();

  // How many submissions have each status (for the filter buttons).
  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  const visible =
    filter === "all"
      ? submissions
      : submissions.filter((s) => s.status === filter);

  return (
    
<main className="min-h-full bg-cream px-5 py-7 text-ink md:px-10 md:py-9 lg:px-12">

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-800 shadow-lg sm:max-w-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12.5 4.5 4L19 7"
            />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="flex-1 leading-5">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="rounded-md px-1 text-lg leading-5 text-ink-soft transition hover:bg-green-50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            ×
          </button>
        </div>
      )}

      <Link
        href="/profile"
        className="mb-7 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-navy shadow-sm transition hover:border-sky-line hover:bg-sky-tint focus:outline-none focus:ring-2 focus:ring-navy/30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Back to profile
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy md:text-4xl">
            My Submissions
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Everything you have uploaded and where it is in the review.
          </p>
        </div>

      </div>

      {/* Status filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(
          (option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={
                filter === option
                  ? "rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  : "rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-sky-line hover:bg-sky-wash"
              }
            >
              {option === "all"
                ? "All"
                : STATUS_STYLES[option].label.split(" ")[0]}{" "}
              ({counts[option]})
            </button>
          )
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-ink-soft shadow-sm">
          Loading your submissions...
        </div>
      ) : visible.length === 0 ? (
        // Empty state
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-ink">
            {submissions.length === 0
              ? "You haven't uploaded anything yet"
              : "Nothing with this status"}
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            Uploaded notes appear here while they are reviewed.
          </p>
          {submissions.length === 0 && (
            <Link
              href="/submit-note"
              className="mt-6 inline-block rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:ring-offset-2"
            >
              Upload your first note
            </Link>
          )}
        </div>
      ) : (
        // List of submissions
        <div className="space-y-3">
          {visible.map((submission) => {
            const status = STATUS_STYLES[submission.status];

            return (
              <div
                key={submission.id}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-sky-line sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{submission.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {resourceTypeLabel(submission.type)}
                    {" · "}
                    {submission.programmes?.name ?? "Unknown programme"}
                    {" · "}
                    Submitted {formatDate(submission.created_at)}
                    {submission.reviewed_at &&
                      ` · Reviewed ${formatDate(submission.reviewed_at)}`}
                  </p>

                  {/* Only rejected submissions have a reason */}
                  {submission.status === "rejected" && (
                    <p className="mt-2 text-sm text-red-700">
                      Reason:{" "}
                      {rejectionReasonLabel(submission.rejection_reason) ||
                        "No reason given"}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => openPdf(submission.file_path, submission.title)}
                  className="shrink-0 rounded-lg border border-sky-line px-4 py-2 text-sm font-semibold text-navy transition hover:bg-sky-wash focus:outline-none focus:ring-2 focus:ring-navy/30"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}