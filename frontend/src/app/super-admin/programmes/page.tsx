"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Programme {
  id: number;
  name: string;
  short_name: string;
}

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadProgrammes();
  }, []);

  async function loadProgrammes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("programmes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setProgrammes((data ?? []) as Programme[]);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6 text-black">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold">
            Programmes
          </h2>

          <p className="mt-2 text-gray-600">
            Manage all academic programmes in Novelle.
          </p>
        </div>

        <button
          className="rounded-lg bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-800"
        >
          + Add Programme
        </button>
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
              <th className="border-b p-4 text-left">
                Programme
              </th>

              <th className="border-b p-4 text-left">
                Short Name
              </th>

              <th className="border-b p-4 text-left">
                Administrator
              </th>

              <th className="border-b p-4 text-center">
                Students
              </th>

              <th className="border-b p-4 text-center">
                Resources
              </th>

              <th className="border-b p-4 text-center">
                Status
              </th>

              <th className="border-b p-4 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : programmes.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center">
                  No programmes found.
                </td>
              </tr>
            ) : (
              programmes.map((programme) => (
                <tr
                  key={programme.id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4 font-medium">
                    {programme.name}
                  </td>

                  <td className="p-4">
                    {programme.short_name}
                  </td>

                  <td className="p-4 text-gray-500">
                    Not Assigned
                  </td>

                  <td className="p-4 text-center">
                    —
                  </td>

                  <td className="p-4 text-center">
                    —
                  </td>

                  <td className="p-4 text-center">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      Active
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2">

                      <button
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                      >
                        View
                      </button>

                      <button
                        className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                      >
                        Edit
                      </button>

                      <button
                        className="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
                      >
                        Assign Admin
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
