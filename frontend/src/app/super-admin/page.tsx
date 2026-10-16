"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  BookOpen,
  Clock3,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    students: 0,
    admins: 0,
    resources: 0,
    submissions: 0,
    programmes: 0,
  });

  const [debug, setDebug] = useState("Loading...");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const students = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");

        const admins = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "programme_admin");

        const resources = await supabase
          .from("resources")
          .select("*", { count: "exact", head: true });

        const submissions = await supabase
          .from("resource_submissions")
          .select("*", { count: "exact", head: true });

        const programmes = await supabase
          .from("programmes")
          .select("*", { count: "exact", head: true });

        setDebug(
          JSON.stringify(
            {
              students: {
                count: students.count,
                error: students.error,
              },
              admins: {
                count: admins.count,
                error: admins.error,
              },
              resources: {
                count: resources.count,
                error: resources.error,
              },
              submissions: {
                count: submissions.count,
                error: submissions.error,
              },
              programmes: {
                count: programmes.count,
                error: programmes.error,
              },
            },
            null,
            2
          )
        );

        setStats({
          students: students.count ?? 0,
          admins: admins.count ?? 0,
          resources: resources.count ?? 0,
          submissions: submissions.count ?? 0,
          programmes: programmes.count ?? 0,
        });
      } catch (err) {
        setDebug(String(err));
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const statistics = [
    {
      label: "Total Students",
      value: stats.students,
      icon: Users,
    },
    {
      label: "Programme Administrators",
      value: stats.admins,
      icon: ShieldCheck,
    },
    {
      label: "Total Resources",
      value: stats.resources,
      icon: BookOpen,
    },
    {
      label: "Pending Submissions",
      value: stats.submissions,
      icon: Clock3,
    },
    {
      label: "Total Programmes",
      value: stats.programmes,
      icon: GraduationCap,
    },
  ];

  return (
    <div className="space-y-8 bg-slate-100 p-2 text-black">
      <div>
        <h2 className="text-3xl font-bold text-black">
          Welcome to Novelle Super Admin
        </h2>

        <p className="mt-2 text-gray-700">
          Manage the CST academic resource-sharing platform.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {statistics.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow"
            >
              <Icon className="mb-4 h-8 w-8 text-blue-600" />

              <p className="text-sm font-medium text-gray-600">
                {item.label}
              </p>

              <h2 className="mt-2 text-3xl font-bold text-black">
                {loading ? "..." : item.value}
              </h2>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-red-500 bg-red-50 p-4">
        <h3 className="font-bold text-red-700">
          DEBUG OUTPUT
        </h3>

        <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-xs text-black">
          {debug}
        </pre>
      </div>
    </div>
  );
}
