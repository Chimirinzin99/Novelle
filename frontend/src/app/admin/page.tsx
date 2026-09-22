"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  FileQuestion,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  programme_id: number | null;
  role: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [programmeName, setProgrammeName] = useState("");

  const [pendingCount, setPendingCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [papersCount, setPapersCount] = useState(0);
  const [assignmentsCount, setAssignmentsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAdmin = async () => {
      setLoading(true);
      setError("");

      // Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get user's profile
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, email, programme_id, role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
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

      const isSuperAdmin = profileData.role === "super_admin";

      // Get programme name
      if (profileData.programme_id) {
        const { data: programmeData, error: programmeError } =
          await supabase
            .from("programmes")
            .select("name")
            .eq("id", profileData.programme_id)
            .maybeSingle();

        if (programmeError) {
          console.error(
            "PROGRAMME ERROR:",
            programmeError
          );
        }

        if (programmeData) {
          setProgrammeName(programmeData.name);
        }
      }

      /*
       * PROGRAMME ADMIN
       *
       * Only count resources belonging
       * to their own programme.
       */
      if (!isSuperAdmin && profileData.programme_id) {
        const programmeId = profileData.programme_id;

        // Pending submissions
        const {
          count: pending,
          error: pendingError,
        } = await supabase
          .from("resource_submissions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("programme_id", programmeId)
          .eq("status", "pending");

        if (pendingError) {
          console.error(
            "PENDING COUNT ERROR:",
            pendingError
          );
        } else {
          setPendingCount(pending ?? 0);
        }

        // Notes
        const { count: notes, error: notesError } =
          await supabase
            .from("resources")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("programme_id", programmeId)
            .eq("type", "note");

        if (notesError) {
          console.error(
            "NOTES COUNT ERROR:",
            notesError
          );
        } else {
          setNotesCount(notes ?? 0);
        }

        // Question papers
        const {
          count: papers,
          error: papersError,
        } = await supabase
          .from("resources")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("programme_id", programmeId)
          .eq("type", "question_paper");

        if (papersError) {
          console.error(
            "PAPERS COUNT ERROR:",
            papersError
          );
        } else {
          setPapersCount(papers ?? 0);
        }

        // Assignments
        const {
          count: assignments,
          error: assignmentsError,
        } = await supabase
          .from("resources")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("programme_id", programmeId)
          .eq("type", "assignment");

        if (assignmentsError) {
          console.error(
            "ASSIGNMENTS COUNT ERROR:",
            assignmentsError
          );
        } else {
          setAssignmentsCount(assignments ?? 0);
        }
      }

      /*
       * SUPER ADMIN
       *
       * Count everything across CST.
       */
      if (isSuperAdmin) {
        // Pending submissions
        const { count: pending } =
          await supabase
            .from("resource_submissions")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending");

        setPendingCount(pending ?? 0);

        // Notes
        const { count: notes } =
          await supabase
            .from("resources")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("type", "note");

        setNotesCount(notes ?? 0);

        // Question papers
        const { count: papers } =
          await supabase
            .from("resources")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("type", "question_paper");

        setPapersCount(papers ?? 0);

        // Assignments
        const { count: assignments } =
          await supabase
            .from("resources")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("type", "assignment");

        setAssignmentsCount(assignments ?? 0);
      }

      setLoading(false);
    };

    loadAdmin();
  }, [router]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-gray-500">
          Loading admin dashboard...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-red-600">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isSuperAdmin = profile.role === "super_admin";

  return (
    <main className="flex min-h-screen bg-slate-50 text-gray-900">

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">

        {/* Logo */}
        <div className="border-b border-gray-200 px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Novelle
          </button>

          <p className="mt-1 text-xs text-gray-500">
            {isSuperAdmin
              ? "Super Admin"
              : "Programme Admin"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5">

          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Management
          </p>

          <button
            onClick={() =>
              router.push("/admin/submissions")
            }
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span>Pending Submissions</span>
          </button>

          <button
            onClick={() => router.push("/admin/notes")}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <FileText className="h-5 w-5" />
            <span>Manage Notes</span>
          </button>

          <button
            onClick={() =>
              router.push("/admin/question-papers")
            }
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <FileQuestion className="h-5 w-5" />
            <span>Manage Question Papers</span>
          </button>

          <button
            onClick={() =>
              router.push("/admin/assignments")
            }
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ClipboardList className="h-5 w-5" />
            <span>Manage Assignments</span>
          </button>

        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 p-4">

          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {profile.full_name || "Admin"}
            </p>

            <p className="truncate text-xs text-gray-500">
              {profile.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>

        </div>
      </aside>

      {/* Main Content */}
      <section className="min-w-0 flex-1 overflow-y-auto">

        <div className="w-full px-6 py-8 md:px-8 lg:px-10">

          {/* Mobile top */}
          <div className="mb-8 flex items-center justify-between md:hidden">

            <div>
              <button
                onClick={() => router.push("/")}
                className="text-2xl font-bold text-gray-900"
              >
                Novelle
              </button>

              <p className="mt-1 text-xs text-gray-500">
                {isSuperAdmin
                  ? "Super Admin"
                  : "Programme Admin"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>

          </div>

          {/* Welcome */}
          <div className="mb-8">

            <p className="text-sm font-medium text-blue-600">
              {isSuperAdmin
                ? "Super Admin"
                : "Programme Admin"}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Welcome back
              {profile.full_name
                ? `, ${profile.full_name}`
                : ""}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {isSuperAdmin
                ? "Overview of Novelle resources across CST."
                : `Overview of ${programmeName} resources.`}
            </p>

          </div>

          {/* Programme */}
          {!isSuperAdmin && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Programme
              </p>

              <p className="mt-1 text-base font-semibold text-gray-900">
                {programmeName}
              </p>

            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

            {/* Notes */}
            <button
              onClick={() => router.push("/admin/notes")}
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Notes
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {notesCount}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Published notes
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <FileText className="h-5 w-5" />
                </div>

              </div>
            </button>

            {/* Question Papers */}
            <button
              onClick={() =>
                router.push("/admin/question-papers")
              }
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Question Papers
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {papersCount}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Published papers
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <FileQuestion className="h-5 w-5" />
                </div>

              </div>
            </button>

            {/* Assignments */}
            <button
              onClick={() =>
                router.push("/admin/assignments")
              }
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Assignments
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {assignmentsCount}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Published assignments
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <ClipboardList className="h-5 w-5" />
                </div>

              </div>
            </button>

            {/* Pending */}
            <button
              onClick={() =>
                router.push("/admin/submissions")
              }
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Pending Submissions
                  </p>

                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {pendingCount}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Need review
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

              </div>
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}