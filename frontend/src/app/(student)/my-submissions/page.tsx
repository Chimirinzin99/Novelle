"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { rejectionReasonLabel } from "@/lib/rejectionReasons";

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
  pending: { label: "Pending review", className: "bg-yellow-100 text-yellow-800" },
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
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
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

  // Open the student's own PDF. Allowed by the storage policy from
  // migration 002 (files in submissions/<their-id>/).
  async function viewFile(filePath: string) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 60); // link valid for 60 seconds

    if (error || !data) {
      console.error("View file error:", error);
      alert("Could not open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

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
    <main className="min-h-full bg-gray-200 px-6 py-8 text-gray-900 md:px-10 lg:px-12">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            My Submissions
          </h1>
          <p className="mt-2 text-sm text-gray-500">
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
              onClick={() => setFilter(option)}
              className={
                filter === option
                  ? "rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white"
                  : "rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
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
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500">
          Loading your submissions...
        </div>
      ) : visible.length === 0 ? (
        // Empty state
        <div className="rounded-2xl bg-white p-12 text-center">
          <h3 className="text-lg font-semibold">
            {submissions.length === 0
              ? "You haven't uploaded anything yet"
              : "Nothing with this status"}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Uploaded notes appear here while they are reviewed.
          </p>
          {submissions.length === 0 && (
            <Link
              href="/submit-note"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
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
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{submission.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    <span className="capitalize">{submission.type}</span>
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
                  onClick={() => viewFile(submission.file_path)}
                  className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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