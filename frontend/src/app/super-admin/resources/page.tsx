"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Resource {
  id: number;
  title: string | null;
  type: string | null;
  programme: string | null;
  subject: string | null;
  uploaded_by: string | null;
  status: string | null;
  created_at: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadResources() {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setResources((data ?? []) as Resource[]);
      }

      setLoading(false);
    }

    loadResources();
  }, []);

  return (
    <div className="space-y-6 text-black">
      <div>
        <h2 className="text-4xl font-bold">Resources</h2>

        <p className="mt-2 text-gray-600">
          View all uploaded learning resources.
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
              <th className="border-b p-4 text-left">Subject</th>
              <th className="border-b p-4 text-left">Status</th>
              <th className="border-b p-4 text-left">Uploaded</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  No resources found.
                </td>
              </tr>
            ) : (
              resources.map((resource) => (
                <tr key={resource.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">
                    {resource.title?.trim()
                      ? resource.title
                      : "Untitled Resource"}
                  </td>

                  <td className="p-4">
                    {resource.type ?? "-"}
                  </td>

                  <td className="p-4">
                    {resource.programme ?? "-"}
                  </td>

                  <td className="p-4">
                    {resource.subject ?? "-"}
                  </td>

                  <td className="p-4">
                    <span className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {resource.status ?? "Approved"}
                    </span>
                  </td>

                  <td className="p-4">
                    {new Date(resource.created_at).toLocaleDateString()}
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