
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  module_id: number | null;
  year: number | null;
  semester: number | null;
  file_path: string;
  submitted_by: string | null;
  status: string;
  created_at: string;
};

type Module = {
  id: number;
  module_code: string;
  module_name: string;
  year: number;
  semester: number;
  active: boolean;
};

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [programmeName, setProgrammeName] = useState("");

  const [selectedYear, setSelectedYear] = useState<
    Record<number, string>
  >({});

  const [selectedSemester, setSelectedSemester] = useState<
    Record<number, string>
  >({});

  // Stores the module CODE typed by the admin
  const [selectedModule, setSelectedModule] = useState<
    Record<number, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [error, setError] = useState("");

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

    // Get admin profile
    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, programme_id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(profileError);
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      setError("Your profile could not be found.");
      setLoading(false);
      return;
    }

    // Only admins can access this page
    if (
      profileData.role !== "programme_admin" &&
      profileData.role !== "super_admin"
    ) {
      router.push("/");
      return;
    }

    setProfile(profileData);

    // Get programme name
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

    // Get pending submissions
    let submissionsQuery = supabase
      .from("resource_submissions")
      .select(
        "id, title, type, programme_id, module_id, year, semester, file_path, submitted_by, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (
      profileData.role === "programme_admin" &&
      profileData.programme_id
    ) {
      submissionsQuery = submissionsQuery.eq(
        "programme_id",
        profileData.programme_id
      );
    }

    const {
      data: submissionsData,
      error: submissionsError,
    } = await submissionsQuery;

    if (submissionsError) {
      console.error(submissionsError);
      setError(submissionsError.message);
      setLoading(false);
      return;
    }

    setSubmissions(submissionsData || []);

    // Get active modules
    let modulesQuery = supabase
      .from("modules")
      .select(
        "id, module_code, module_name, year, semester, active"
      )
      .eq("active", true)
      .order("year", { ascending: true })
      .order("semester", { ascending: true })
      .order("module_code", { ascending: true });

    if (
      profileData.role === "programme_admin" &&
      profileData.programme_id
    ) {
      modulesQuery = modulesQuery.eq(
        "programme_id",
        profileData.programme_id
      );
    }

    const { data: modulesData, error: modulesError } =
      await modulesQuery;

    if (modulesError) {
      console.error(modulesError);
      setError(modulesError.message);
      setLoading(false);
      return;
    }

    setModules(modulesData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
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

  // Approve submission
  const handleApprove = async (submission: Submission) => {
    const year = selectedYear[submission.id];
    const semester = selectedSemester[submission.id];
    const moduleCode = selectedModule[submission.id]?.trim();

    if (!year || !semester || !moduleCode) {
      setError(
        "Please enter Year, Semester, and Module before approving."
      );
      return;
    }

    setApprovingId(submission.id);
    setError("");

    // Find module using the typed module code
    const selectedModuleData = modules.find(
      (module) =>
        module.module_code.toLowerCase() ===
        moduleCode.toLowerCase()
    );

    if (!selectedModuleData) {
      setError(
        `Module "${moduleCode}" was not found. Please enter a valid module code.`
      );
      setApprovingId(null);
      return;
    }

    // Make sure the module belongs to the selected
    // year and semester
    if (
      selectedModuleData.year !== Number(year) ||
      selectedModuleData.semester !== Number(semester)
    ) {
      setError(
        `Module ${selectedModuleData.module_code} belongs to Year ${selectedModuleData.year}, Semester ${selectedModuleData.semester}.`
      );
      setApprovingId(null);
      return;
    }

    // Create approved resource
    const { error: resourceError } = await supabase
      .from("resources")
      .insert({
        title: submission.title,
        type: submission.type,
        programme_id: submission.programme_id,
        module_id: selectedModuleData.id,
        year: Number(year),
        semester: Number(semester),
        file_path: submission.file_path,
        uploaded_by: profile?.id,
      });

    if (resourceError) {
      console.error(resourceError);
      setError(
        `Could not approve resource: ${resourceError.message}`
      );
      setApprovingId(null);
      return;
    }

    // Mark submission as approved
    const { error: updateError } = await supabase
      .from("resource_submissions")
      .update({
        status: "approved",
        year: Number(year),
        semester: Number(semester),
        module_id: selectedModuleData.id,
      })
      .eq("id", submission.id);

    if (updateError) {
      console.error(updateError);
      setError(
        `Resource was created, but submission status could not be updated: ${updateError.message}`
      );
      setApprovingId(null);
      return;
    }

    // Remove approved submission from pending list
    setSubmissions((current) =>
      current.filter(
        (item) => item.id !== submission.id
      )
    );

    setApprovingId(null);
  };

  // Reject submission
  const handleReject = async (submission: Submission) => {
    setRejectingId(submission.id);
    setError("");

    const { error: updateError } = await supabase
      .from("resource_submissions")
      .update({
        status: "rejected",
      })
      .eq("id", submission.id);

    if (updateError) {
      console.error(updateError);
      setError(
        `Could not reject submission: ${updateError.message}`
      );
      setRejectingId(null);
      return;
    }

    setSubmissions((current) =>
      current.filter(
        (item) => item.id !== submission.id
      )
    );

    setRejectingId(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-base font-medium text-gray-700">
          Loading submissions...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-8 py-8 text-gray-900">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-3 text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Admin Dashboard
          </button>

          <p className="text-sm font-semibold text-blue-600">
            Student Submissions
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Pending Submissions
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            {profile?.role === "programme_admin"
              ? `Review submissions for ${programmeName}.`
              : "Review student submissions across CST."}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Empty */}
        {submissions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              No pending submissions
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              There are currently no student submissions waiting
              for review.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >

                {/* Submission information */}
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                  <div>
                    <div className="flex items-center gap-3">

                      <h2 className="text-xl font-semibold text-gray-900">
                        {submission.title}
                      </h2>

                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                        Pending
                      </span>

                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Type:{" "}
                      {submission.type === "note"
                        ? "Note"
                        : submission.type}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Submitted{" "}
                      {new Date(
                        submission.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleViewFile(
                        submission.file_path
                      )
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View PDF
                  </button>

                </div>

                {/* Classification */}
                <div className="mt-6 rounded-lg bg-gray-50 p-4">

                  <p className="text-sm font-semibold text-gray-800">
                    Submission classification
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Assign the academic year, semester,
                    and module before approving.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

                    {/* Year */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Year
                      </label>

                      <select
                        value={
                          selectedYear[
                            submission.id
                          ] || ""
                        }
                        onChange={(e) =>
                          setSelectedYear(
                            (current) => ({
                              ...current,
                              [submission.id]:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Select year
                        </option>

                        <option value="1">
                          Year 1
                        </option>

                        <option value="2">
                          Year 2
                        </option>

                        <option value="3">
                          Year 3
                        </option>

                        <option value="4">
                          Year 4
                        </option>
                      </select>
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Semester
                      </label>

                      <select
                        value={
                          selectedSemester[
                            submission.id
                          ] || ""
                        }
                        onChange={(e) =>
                          setSelectedSemester(
                            (current) => ({
                              ...current,
                              [submission.id]:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Select semester
                        </option>

                        <option value="1">
                          Semester 1
                        </option>

                        <option value="2">
                          Semester 2
                        </option>
                      </select>
                    </div>

                    {/* Module */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Module
                      </label>

                      <input
                        type="text"
                        value={
                          selectedModule[
                            submission.id
                          ] || ""
                        }
                        onChange={(e) =>
                          setSelectedModule(
                            (current) => ({
                              ...current,
                              [submission.id]:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="e.g. CSF101"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        Enter the module code.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex justify-end gap-3">

                  <button
                    onClick={() =>
                      handleReject(submission)
                    }
                    disabled={
                      rejectingId ===
                      submission.id
                    }
                    className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rejectingId === submission.id
                      ? "Rejecting..."
                      : "Reject"}
                  </button>

                  <button
                    onClick={() =>
                      handleApprove(submission)
                    }
                    disabled={
                      approvingId ===
                      submission.id
                    }
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {approvingId === submission.id
                      ? "Approving..."
                      : "Approve"}
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
