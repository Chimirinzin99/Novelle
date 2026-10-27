"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { resourceTypeLabel } from "@/lib/resourceTypes";
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
  "w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-[#E5EAF1] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/60 disabled:bg-gray-100 dark:disabled:bg-[#1D2938] disabled:text-gray-500 dark:disabled:text-[#8B98AA]";

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

  useEffect(() => {
    async function loadData() {

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

        setSubmissions(submissionsData.submissions || []);
        setModules(modulesData.modules || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not connect to the backend."
        );
      }

      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open private PDF
  const handleViewFile = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 60);

    if (error) {
      console.error(error);
      setError("Unable to open the submitted file.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

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

    setBusyId(submission.id);

    try {
      await backendFetch(`/api/submissions/${submission.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ module_id: Number(moduleId) }),
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
      <main className="min-h-screen bg-gray-50 dark:bg-[#0E141D] px-5 py-8 text-gray-900 dark:text-[#E5EAF1] md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-8 inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-[#B4BFCD] shadow-sm transition hover:bg-gray-100 dark:hover:bg-[#263446]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-base font-medium text-gray-700 dark:text-[#B4BFCD]">Loading submissions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0E141D] px-8 py-8 text-gray-900 dark:text-[#E5EAF1]">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-[#B4BFCD] shadow-sm transition hover:bg-gray-100 dark:hover:bg-[#263446]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>

          <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">
            Student Submissions
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-[#E5EAF1]">
            Pending Submissions
          </h1>

          <p className="mt-2 text-sm text-gray-600 dark:text-[#B4BFCD]">
            {/* Programme admins see their programme name; super admins see all of CST (lib/roles.ts) */}
            {isProgrammeAdminRole(profile?.role)
              ? `Review submissions for ${programmeName}.`
              : "Review student submissions across CST."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E5EAF1]">
              No pending submissions
            </h2>

            <p className="mt-2 text-sm text-gray-600 dark:text-[#B4BFCD]">
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
                  className="rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-6 shadow-sm"
                >
                  {/* Submission information */}
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E5EAF1]">
                          {submission.title}
                        </h2>

                        <span className="rounded-full bg-yellow-100 dark:bg-amber-900/40 px-3 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                          Pending
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-600 dark:text-[#B4BFCD]">
                        Type: {resourceTypeLabel(submission.type)}
                        {/* Only super admins need the programme name (lib/roles.ts) */}
                        {isSuperAdminRole(profile?.role) &&
                          submission.programme &&
                          ` · ${submission.programme.name}`}
                      </p>

                      <p className="mt-1 text-xs text-gray-500 dark:text-[#8B98AA]">
                        Submitted
                        {submission.submitter?.full_name
                          ? ` by ${submission.submitter.full_name}`
                          : ""}{" "}
                        on {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleViewFile(submission.file_path)}
                      className="rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-2 text-sm font-semibold text-gray-700 dark:text-[#B4BFCD] hover:bg-gray-50 dark:hover:bg-[#1D2938]"
                    >
                      View PDF
                    </button>
                  </div>

                  {/* Classification */}
                  <div className="mt-6 rounded-lg bg-gray-50 dark:bg-[#0E141D] p-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-[#E5EAF1]">
                      Submission classification
                    </p>

                    <p className="mt-1 text-xs text-gray-600 dark:text-[#B4BFCD]">
                      Choose the year and semester, then the module, before
                      approving.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Year */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-[#E5EAF1]">
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
                        <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-[#E5EAF1]">
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
                        <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-[#E5EAF1]">
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

                  {/* Reject reason (shown after clicking Reject) */}
                  {showRejectFor === submission.id && (
                    <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4">
                      <label className="mb-2 block text-sm font-semibold text-red-800 dark:text-red-300">
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

                      <p className="mt-2 text-xs text-red-700 dark:text-red-300">
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
                          className="rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-[#B4BFCD] hover:bg-gray-50 dark:hover:bg-[#1D2938] disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#172130] px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => handleApprove(submission)}
                          disabled={busy || !selectedModule[submission.id]}
                          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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