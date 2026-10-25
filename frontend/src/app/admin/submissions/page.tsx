"use client";

// Admin review of pending submissions (/admin/submissions).
// Part 13d: each submission shows what the student said about who made it
// and Solved; the admin can correct both before approving (sent with
// module_id to POST /api/submissions/:id/approve).
// Part 12: hard-coded colours switched to the theme colours.
// PDF preview part: View PDF opens the preview window instead of a new tab.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { resourceTypeLabel } from "@/lib/resourceTypes";
import {
  authorFormError,
  authorFormFrom,
  authorJson,
  isSolvableType,
  type AuthorForm,
} from "@/lib/author";
import AuthorFields, { SolvedField } from "@/components/AuthorFields";
import {
  isAdminRole,
  isProgrammeAdminRole,
  isSuperAdminRole,
} from "@/lib/roles";

type Profile = {
  id: string;
  programme_id: number | null;
  role: string;
};

type Submission = {
  id: number;
  title: string;
  type: string;
  programme_id: number;
  file_path: string;
  status: string;
  created_at: string;
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
  programme: { name: string; short_name: string | null } | null;
  submitter: { full_name: string | null; email: string | null } | null;
};

type Module = {
  id: number;
  programme_id: number;
  module_code: string;
  module_name: string;
  year: number;
  semester: number;
  active: boolean;
};

const selectClass =
  "w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint disabled:bg-sky-wash disabled:text-ink-soft";

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [programmeName, setProgrammeName] = useState("");

  // Per-submission form state, keyed by submission id
  const [selectedYear, setSelectedYear] = useState<Record<number, string>>({});
  const [selectedSemester, setSelectedSemester] = useState<Record<number, string>>({});
  const [selectedModule, setSelectedModule] = useState<Record<number, string>>({});
  const [selectedReason, setSelectedReason] = useState<Record<number, string>>({});
  const [showRejectFor, setShowRejectFor] = useState<number | null>(null);
  // Part 13d: author credit + Solved per submission (pre-filled from the student)
  const [authorForms, setAuthorForms] = useState<Record<number, AuthorForm>>({});
  const [solvedForms, setSolvedForms] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Calls the backend with the logged-in user's token
  const backendFetch = async (path: string, init: RequestInit = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      throw new Error("Not logged in.");
    }

    const response = await callBackend(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init.headers || {}),
      },
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, programme_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setError(profileError?.message || "Your profile could not be found.");
      setLoading(false);
      return;
    }

    // lib/roles.ts decides who counts as an admin.
    if (!isAdminRole(profileData.role)) {
      router.push("/home");
      return;
    }

    setProfile(profileData);

    if (profileData.programme_id) {
      const { data: programmeData } = await supabase
        .from("programmes")
        .select("name")
        .eq("id", profileData.programme_id)
        .maybeSingle();

      if (programmeData) {
        setProgrammeName(programmeData.name);
      }
    }

    try {
      const [submissionsData, modulesData] = await Promise.all([
        backendFetch("/api/submissions?status=pending"),
        backendFetch("/api/modules"),
      ]);

      const loaded: Submission[] = submissionsData.submissions || [];
      setSubmissions(loaded);
      setModules(modulesData.modules || []);

      // Part 13d: start each form with what the student chose
      setAuthorForms(
        Object.fromEntries(
          loaded.map((s) => [s.id, authorFormFrom(s.author_type, s.author_name)])
        )
      );
      setSolvedForms(
        Object.fromEntries(loaded.map((s) => [s.id, s.is_solved === true]))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to the backend."
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the submitted (private) PDF in the preview window. Storage RLS
  // allows admins to see submissions of their programme (all for super admin).
  const { openPdf } = usePreview();

  // Active modules for this submission's programme, year and semester
  const modulesFor = (submission: Submission) => {
    const year = Number(selectedYear[submission.id]);
    const semester = Number(selectedSemester[submission.id]);

    if (!year || !semester) return [];

    return modules.filter(
      (module) =>
        module.active &&
        module.programme_id === submission.programme_id &&
        module.year === year &&
        module.semester === semester
    );
  };

  const removeFromList = (submissionId: number) => {
    setSubmissions((current) =>
      current.filter((item) => item.id !== submissionId)
    );
  };

  const handleApprove = async (submission: Submission) => {
    const moduleId = selectedModule[submission.id];

    setError("");
    setSuccess("");

    if (!moduleId) {
      setError("Please choose a year, semester and module before approving.");
      return;
    }

    // Part 13d: check the credit (an old submission may have none — fine)
    const author = authorForms[submission.id];
    const authorProblem =
      author && author.authorType ? authorFormError(author) : "";
    if (authorProblem) {
      setError(authorProblem);
      return;
    }

    setBusyId(submission.id);

    try {
      await backendFetch(`/api/submissions/${submission.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          module_id: Number(moduleId),
          ...(author ? authorJson(author) : {}), // Part 13d
          ...(isSolvableType(submission.type)
            ? { is_solved: solvedForms[submission.id] === true }
            : {}),
        }),
      });

      removeFromList(submission.id);
      setSuccess(`"${submission.title}" was approved and published.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (submission: Submission) => {
    const reason = selectedReason[submission.id];

    setError("");
    setSuccess("");

    if (!reason) {
      setError("Please choose a reason for rejecting.");
      return;
    }

    setBusyId(submission.id);

    try {
      await backendFetch(`/api/submissions/${submission.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      removeFromList(submission.id);
      setShowRejectFor(null);
      setSuccess(`"${submission.title}" was rejected.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-5 py-8 text-ink md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-8 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-nav shadow-sm transition hover:bg-sky-wash"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-base font-medium text-ink-nav">Loading submissions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-8 py-8 text-ink">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-nav shadow-sm transition hover:bg-sky-wash"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>

          <p className="text-sm font-semibold text-navy-soft">
            Student Submissions
          </p>

          <h1 className="mt-1 text-3xl font-bold text-ink">
            Pending Submissions
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            {/* Programme admins see their programme name; super admins see all of CST (lib/roles.ts) */}
            {isProgrammeAdminRole(profile?.role)
              ? `Review submissions for ${programmeName}.`
              : "Review student submissions across CST."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="rounded-xl border border-line bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              No pending submissions
            </h2>

            <p className="mt-2 text-sm text-ink-soft">
              There are currently no student submissions waiting for review.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {submissions.map((submission) => {
              const busy = busyId === submission.id;
              const moduleOptions = modulesFor(submission);
              const yearAndSemesterChosen =
                !!selectedYear[submission.id] &&
                !!selectedSemester[submission.id];

              return (
                <div
                  key={submission.id}
                  className="rounded-xl border border-line bg-white p-6 shadow-sm"
                >
                  {/* Submission information */}
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold text-ink">
                          {submission.title}
                        </h2>

                        <span className="rounded-full bg-gold-tint px-3 py-1 text-xs font-semibold text-gold-ink">
                          Pending
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-ink-soft">
                        Type: {resourceTypeLabel(submission.type)}
                        {/* Only super admins need the programme name (lib/roles.ts) */}
                        {isSuperAdminRole(profile?.role) &&
                          submission.programme &&
                          ` · ${submission.programme.name}`}
                      </p>

                      <p className="mt-1 text-xs text-ink-soft">
                        Submitted
                        {submission.submitter?.full_name
                          ? ` by ${submission.submitter.full_name}`
                          : ""}{" "}
                        on {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => openPdf(submission.file_path, submission.title)}
                      className="rounded-lg border border-sky-line bg-white px-4 py-2 text-sm font-semibold text-ink-nav hover:bg-cream"
                    >
                      View PDF
                    </button>
                  </div>

                  {/* Classification */}
                  <div className="mt-6 rounded-lg bg-cream p-4">
                    <p className="text-sm font-semibold text-ink">
                      Submission classification
                    </p>

                    <p className="mt-1 text-xs text-ink-soft">
                      Choose the year and semester, then the module, before
                      approving.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Year */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-ink">
                          Year
                        </label>

                        <select
                          value={selectedYear[submission.id] || ""}
                          onChange={(e) => {
                            setSelectedYear((current) => ({
                              ...current,
                              [submission.id]: e.target.value,
                            }));
                            setSelectedModule((current) => ({
                              ...current,
                              [submission.id]: "",
                            }));
                          }}
                          className={selectClass}
                        >
                          <option value="">Select year</option>
                          <option value="1">Year 1</option>
                          <option value="2">Year 2</option>
                          <option value="3">Year 3</option>
                          <option value="4">Year 4</option>
                          <option value="5">Year 5</option>
                        </select>
                      </div>

                      {/* Semester */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-ink">
                          Semester
                        </label>

                        <select
                          value={selectedSemester[submission.id] || ""}
                          onChange={(e) => {
                            setSelectedSemester((current) => ({
                              ...current,
                              [submission.id]: e.target.value,
                            }));
                            setSelectedModule((current) => ({
                              ...current,
                              [submission.id]: "",
                            }));
                          }}
                          className={selectClass}
                        >
                          <option value="">Select semester</option>
                          <option value="1">Semester 1</option>
                          <option value="2">Semester 2</option>
                        </select>
                      </div>

                      {/* Module */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-ink">
                          Module
                        </label>

                        <select
                          value={selectedModule[submission.id] || ""}
                          onChange={(e) =>
                            setSelectedModule((current) => ({
                              ...current,
                              [submission.id]: e.target.value,
                            }))
                          }
                          disabled={
                            !yearAndSemesterChosen || moduleOptions.length === 0
                          }
                          className={selectClass}
                        >
                          <option value="">
                            {!yearAndSemesterChosen
                              ? "Select year and semester first"
                              : moduleOptions.length === 0
                              ? "No active modules"
                              : "Select module"}
                          </option>

                          {moduleOptions.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.module_code} – {module.module_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Part 13d: author credit + Solved (pre-filled from the student) */}
                  <div className="mt-4 rounded-lg bg-cream p-4">
                    <p className="text-sm font-semibold text-ink">
                      Who made it?
                    </p>
                    <p className="mt-1 mb-3 text-xs text-ink-soft">
                      {authorForms[submission.id]?.authorType
                        ? "This is what the student chose. Correct it if it's wrong."
                        : "The student didn't say (submitted before this option existed)."}
                    </p>
                    <AuthorFields
                      idPrefix={`review-${submission.id}`}
                      value={authorForms[submission.id] ?? authorFormFrom(null, null)}
                      onChange={(next) =>
                        setAuthorForms((current) => ({ ...current, [submission.id]: next }))
                      }
                      disabled={busy}
                      selfLabel="The student made it"
                      showNameLabel="Show the student's name"
                    />
                    {isSolvableType(submission.type) && (
                      <div className="mt-4 border-t border-line pt-4">
                        <SolvedField
                          checked={solvedForms[submission.id] === true}
                          onChange={(checked) =>
                            setSolvedForms((current) => ({ ...current, [submission.id]: checked }))
                          }
                          disabled={busy}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reject reason (shown after clicking Reject) */}
                  {showRejectFor === submission.id && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                      <label className="mb-2 block text-sm font-semibold text-red-800">
                        Reason for rejecting
                      </label>

                      <select
                        value={selectedReason[submission.id] || ""}
                        onChange={(e) =>
                          setSelectedReason((current) => ({
                            ...current,
                            [submission.id]: e.target.value,
                          }))
                        }
                        className={selectClass}
                      >
                        <option value="">Select a reason</option>
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason.code} value={reason.code}>
                            {reason.label}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs text-red-700">
                        The student will see this reason.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex justify-end gap-3">
                    {showRejectFor === submission.id ? (
                      <>
                        <button
                          onClick={() => setShowRejectFor(null)}
                          disabled={busy}
                          className="rounded-lg border border-sky-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-nav hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => handleReject(submission)}
                          disabled={busy || !selectedReason[submission.id]}
                          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Rejecting..." : "Confirm reject"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setError("");
                            setShowRejectFor(submission.id);
                          }}
                          disabled={busy}
                          className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => handleApprove(submission)}
                          disabled={busy || !selectedModule[submission.id]}
                          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Approving..." : "Approve"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}