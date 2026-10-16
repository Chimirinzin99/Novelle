"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);

  const [studentCount, setStudentCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [programmeCount, setProgrammeCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);

  const [approved, setApproved] = useState(0);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);

  const [types, setTypes] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);

    const [
      profiles,
      programmes,
      resources,
      submissions,
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("programmes").select("*"),
      supabase.from("resources").select("*"),
      supabase.from("resource_submissions").select("*"),
    ]);

    // Students
    const students =
      profiles.data?.filter(
        (user: any) =>
          user.role !== "programme_admin" &&
          user.role !== "super_admin"
      ) ?? [];

    setStudentCount(students.length);

    // Programme Admins
    const admins =
      profiles.data?.filter(
        (user: any) => user.role === "programme_admin"
      ) ?? [];

    setAdminCount(admins.length);

    // Programmes
    setProgrammeCount(programmes.data?.length ?? 0);

    // Resources
    setResourceCount(resources.data?.length ?? 0);

    // Submissions
    setSubmissionCount(submissions.data?.length ?? 0);

    // Status Counts
    const approvedCount =
      submissions.data?.filter((s: any) => s.status === "approved")
        .length ?? 0;

    const pendingCount =
      submissions.data?.filter((s: any) => s.status === "pending")
        .length ?? 0;

    const rejectedCount =
      submissions.data?.filter((s: any) => s.status === "rejected")
        .length ?? 0;

    setApproved(approvedCount);
    setPending(pendingCount);
    setRejected(rejectedCount);

    // Resource Types
    const typeCounts: Record<string, number> = {};

    resources.data?.forEach((resource: any) => {
      const type =
        resource.resource_type ||
        resource.type ||
        "Unknown";

      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    setTypes(typeCounts);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10 text-xl">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-8 text-black">

      <div>
        <h1 className="text-4xl font-bold">
          Analytics
        </h1>

        <p className="mt-2 text-gray-600">
          System overview of the Novelle platform.
        </p>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-xl border bg-white p-6 shadow">
          <p className="text-gray-500">
            Students
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {studentCount}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow">
          <p className="text-gray-500">
            Programme Admins
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {adminCount}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow">
          <p className="text-gray-500">
            Programmes
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {programmeCount}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow">
          <p className="text-gray-500">
            Resources
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {resourceCount}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow">
          <p className="text-gray-500">
            Submissions
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {submissionCount}
          </h2>
        </div>

      </div>

      {/* Submission Status */}

      <div className="rounded-xl border bg-white p-6 shadow">

        <h2 className="mb-4 text-2xl font-semibold">
          Submission Status
        </h2>

        <table className="w-full">

          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">
                Status
              </th>

              <th className="p-3 text-left">
                Count
              </th>
            </tr>
          </thead>

          <tbody>

            <tr className="border-b">
              <td className="p-3">
                Approved
              </td>

              <td className="p-3">
                {approved}
              </td>
            </tr>

            <tr className="border-b">
              <td className="p-3">
                Pending
              </td>

              <td className="p-3">
                {pending}
              </td>
            </tr>

            <tr>
              <td className="p-3">
                Rejected
              </td>

              <td className="p-3">
                {rejected}
              </td>
            </tr>

          </tbody>

        </table>

      </div>

      {/* Resource Types */}

      <div className="rounded-xl border bg-white p-6 shadow">

        <h2 className="mb-4 text-2xl font-semibold">
          Resources by Type
        </h2>

        <table className="w-full">

          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">
                Type
              </th>

              <th className="p-3 text-left">
                Count
              </th>
            </tr>
          </thead>

          <tbody>

            {Object.entries(types).map(([type, count]) => (
              <tr key={type} className="border-b">
                <td className="p-3">
                  {type}
                </td>

                <td className="p-3">
                  {count}
                </td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
