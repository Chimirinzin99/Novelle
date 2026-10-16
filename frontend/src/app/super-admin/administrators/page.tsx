"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Administrator {
  id: string;
  full_name: string;
  email: string;
  programme?: string | null;
  role: string;
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAdmins() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
      } else {
        const filtered =
            data?.filter(
            (user) => user.role === "programme_admin"
        ) ?? [];
        setAdmins(filtered as Administrator[]);
      }

      setLoading(false);
    }

    loadAdmins();
  }, []);

  return (
    <div className="space-y-6 text-black">
      <div>
        <h2 className="text-4xl font-bold">
          Programme Administrators
        </h2>

        <p className="mt-2 text-gray-600">
          View all programme administrators.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="border-b p-4 text-left">Name</th>
              <th className="border-b p-4 text-left">Email</th>
              <th className="border-b p-4 text-left">Programme</th>
              <th className="border-b p-4 text-left">Role</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={4}>
                  No administrators found.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b">
                  <td className="p-4">
                    {admin.full_name || "-"}
                  </td>

                  <td className="p-4">
                    {admin.email || "-"}
                  </td>

                  <td className="p-4">
                    {admin.programme || "-"}
                  </td>

                  <td className="p-4">
                    <span className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {admin.role}
                    </span>
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
