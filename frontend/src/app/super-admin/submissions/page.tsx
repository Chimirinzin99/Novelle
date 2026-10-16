"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Submission {
  id: number;
  title: string | null;
  type: string | null;
  programme: string | null;
  status: string | null;
  created_at: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    const { data, error } = await supabase
      .from("resource_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSubmissions((data ?? []) as Submission[]);
    }

    setLoading(false);
  }

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("resource_submissions")
      .update({ status })
      .eq("id", id);

    if (!error) {
      loadSubmissions();
    }
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <h2 className="text-4xl font-bold">Submissions</h2>

        <p className="mt-2 text-gray-600">
          Review resource submissions from students.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="border-b p-4 text-left">Title</th>
              <th className="border-b p-4 text-left">Type</th>
              <th className="border-b p-4 text-left">Programme</th>
              <th className="border-b p-4 text-left">Status</th>
              <th className="border-b p-4 text-left">Submitted</th>
              <th className="border-b p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <tr key={submission.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">
                    {submission.title || "Untitled Resource"}
                  </td>

                  <td className="p-4">
                    {submission.type || "-"}
                  </td>

                  <td className="p-4">
                    {submission.programme || "-"}
                  </td>

                  <td className="p-4">
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                      {submission.status || "Pending"}
                    </span>
                  </td>

                  <td className="p-4">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() =>
                          updateStatus(submission.id, "Approved")
                        }
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(submission.id, "Rejected")
                        }
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}