
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  FileQuestion,
  ClipboardList,
  LogOut,
  Layers,
  Users,
  Video,
  Database,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { ROLES, isAdminRole, isSuperAdminRole } from "@/lib/roles";

type ProgrammeOverview = {
  id: number;
  name: string;
  pending: number;
  admins: string[];
};

type UserCounts = {
  students: number;
  programmeAdmins: number;
  deactivated: number;
};

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
  const [videosCount, setVideosCount] = useState(0);
  const [totalResourcesCount, setTotalResourcesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userCounts, setUserCounts] = useState<UserCounts | null>(null);
  const [programmeOverview, setProgrammeOverview] = useState<
    ProgrammeOverview[]
  >([]);

  useEffect(() => {
    const loadAdmin = async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, programme_id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setError("Your profile could not be found.");
          return;
        }

        if (!isAdminRole(profileData.role)) {
          router.push("/home");
          return;
        }

        setProfile(profileData);

        const isSuperAdmin = isSuperAdminRole(profileData.role);
        const programmeId = profileData.programme_id;

        if (programmeId) {
          const { data: programmeData, error: programmeError } =
            await supabase
              .from("programmes")
              .select("name")
              .eq("id", programmeId)
              .maybeSingle();

          if (programmeError) {
            console.error("PROGRAMME ERROR:", programmeError);
          }

          if (programmeData) {
            setProgrammeName(programmeData.name);
          }
        }

        /*
         * Programme admin:
         * Count resources and video links for their own programme.
         */
        if (!isSuperAdmin && programmeId) {
          const [
            pendingResult,
            notesResult,
            papersResult,
            assignmentsResult,
            resourcesResult,
            videosResult,
          ] = await Promise.all([
            supabase
              .from("resource_submissions")
              .select("*", { count: "exact", head: true })
              .eq("programme_id", programmeId)
              .eq("status", "pending"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("programme_id", programmeId)
              .eq("type", "note"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("programme_id", programmeId)
              .eq("type", "question_paper"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("programme_id", programmeId)
              .eq("type", "assignment"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("programme_id", programmeId),

            // Total saved video links in this programme.
            
 // Total saved video links in this programme.
supabase
  .from("resources")
  .select("id", { count: "exact", head: true })
  .eq("programme_id", programmeId)
  .eq("type", "video"),

          ]);

          if (pendingResult.error) {
            console.error("PENDING COUNT ERROR:", pendingResult.error);
          } else {
            setPendingCount(pendingResult.count ?? 0);
          }

          if (notesResult.error) {
            console.error("NOTES COUNT ERROR:", notesResult.error);
          } else {
            setNotesCount(notesResult.count ?? 0);
          }

          if (papersResult.error) {
            console.error("PAPERS COUNT ERROR:", papersResult.error);
          } else {
            setPapersCount(papersResult.count ?? 0);
          }

          if (assignmentsResult.error) {
            console.error(
              "ASSIGNMENTS COUNT ERROR:",
              assignmentsResult.error
            );
          } else {
            setAssignmentsCount(assignmentsResult.count ?? 0);
          }

          if (resourcesResult.error) {
            console.error(
              "TOTAL RESOURCES COUNT ERROR:",
              resourcesResult.error
            );
          } else {
            setTotalResourcesCount(resourcesResult.count ?? 0);
          }

          if (videosResult.error) {
            console.error("VIDEOS COUNT ERROR:", videosResult.error);
          } else {
            setVideosCount(videosResult.count ?? 0);
          }
        }

        /*
         * Super admin:
         * Count resources and video links across all programmes.
         */
        if (isSuperAdmin) {
          const [
            pendingResult,
            notesResult,
            papersResult,
            assignmentsResult,
            resourcesResult,
            videosResult,
          ] = await Promise.all([
            supabase
              .from("resource_submissions")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("type", "note"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("type", "question_paper"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true })
              .eq("type", "assignment"),

            supabase
              .from("resources")
              .select("*", { count: "exact", head: true }),

            // Total saved video links across CST.
            supabase
              
  .from("resources")
  .select("id", { count: "exact", head: true })
  .eq("type", "video")
          ]);

          if (pendingResult.error) {
            console.error("PENDING COUNT ERROR:", pendingResult.error);
          } else {
            setPendingCount(pendingResult.count ?? 0);
          }

          if (notesResult.error) {
            console.error("NOTES COUNT ERROR:", notesResult.error);
          } else {
            setNotesCount(notesResult.count ?? 0);
          }

          if (papersResult.error) {
            console.error("PAPERS COUNT ERROR:", papersResult.error);
          } else {
            setPapersCount(papersResult.count ?? 0);
          }

          if (assignmentsResult.error) {
            console.error(
              "ASSIGNMENTS COUNT ERROR:",
              assignmentsResult.error
            );
          } else {
            setAssignmentsCount(assignmentsResult.count ?? 0);
          }

          if (resourcesResult.error) {
            console.error(
              "TOTAL RESOURCES COUNT ERROR:",
              resourcesResult.error
            );
          } else {
            setTotalResourcesCount(resourcesResult.count ?? 0);
          }

          if (videosResult.error) {
            console.error("VIDEOS COUNT ERROR:", videosResult.error);
          } else {
            setVideosCount(videosResult.count ?? 0);
          }

          // Load users from the backend.
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            const [usersResponse, pendingRowsResult, programmesResult] =
              await Promise.all([
                fetch(`${BACKEND_URL}/api/users`, {
                  headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                }),

                supabase
                  .from("resource_submissions")
                  .select("programme_id")
                  .eq("status", "pending"),

                supabase
                  .from("programmes")
                  .select("id, name")
                  .order("name"),
              ]);

            const usersData = await usersResponse.json();

            if (!usersResponse.ok) {
              throw new Error(
                usersData.message || "Failed to load users."
              );
            }

            const users: {
              full_name: string;
              role: string;
              programme_id: number | null;
              is_active: boolean;
            }[] = usersData.users || [];

            setUserCounts({
              students: users.filter(
                (u) => u.role === ROLES.student
              ).length,

              programmeAdmins: users.filter(
                (u) => u.role === ROLES.programmeAdmin
              ).length,

              deactivated: users.filter(
                (u) => !u.is_active
              ).length,
            });

            if (pendingRowsResult.error) {
              console.error(
                "PROGRAMME PENDING ERROR:",
                pendingRowsResult.error
              );
            }

            if (programmesResult.error) {
              console.error("PROGRAMMES ERROR:", programmesResult.error);
            }

            const pendingRows = pendingRowsResult.data || [];

            setProgrammeOverview(
              (programmesResult.data || []).map((programme) => ({
                id: programme.id,
                name: programme.name,

                pending: pendingRows.filter(
                  (row) => row.programme_id === programme.id
                ).length,

                admins: users
                  .filter(
                    (u) =>
                      u.role === ROLES.programmeAdmin &&
                      u.is_active &&
                      u.programme_id === programme.id
                  )
                  .map((u) => u.full_name),
              }))
            );
          } catch (overviewError) {
            console.error("OVERVIEW ERROR:", overviewError);
          }
        }
      } catch (loadError) {
        console.error("ADMIN DASHBOARD ERROR:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAdmin();
  }, [router]);

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
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isSuperAdmin = isSuperAdminRole(profile.role);

  return (
    <main className="flex min-h-screen bg-slate-50 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="border-b border-gray-200 px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Novelle
          </button>

          <p className="mt-1 text-xs text-gray-500">
            {isSuperAdmin ? "Super Admin" : "Programme Admin"}
          </p>
        </div>

        <nav className="flex-1 px-3 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Management
          </p>

          <button
            onClick={() => router.push("/admin/submissions")}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span>Pending Submissions</span>
          </button>

          <button
            onClick={() => router.push("/admin/resources")}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <FileText className="h-5 w-5" />
            <span>Manage Resources</span>
          </button>

          <button
            onClick={() => router.push("/admin/modules")}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <Layers className="h-5 w-5" />
            <span>{isSuperAdmin ? "Manage Modules" : "Modules"}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => router.push("/admin/users")}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <Users className="h-5 w-5" />
              <span>Manage Users</span>
            </button>
          )}
        </nav>

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
                {isSuperAdmin ? "Super Admin" : "Programme Admin"}
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
              {isSuperAdmin ? "Super Admin" : "Programme Admin"}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Welcome back
              {profile.full_name ? `, ${profile.full_name}` : ""}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {/* Total Resources */}
            <button
              onClick={() => router.push("/admin/resources")}
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Resources
                  </p>
                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {totalResourcesCount}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    All resource records
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <Database className="h-5 w-5" />
                </div>
              </div>
            </button>

            {/* Pending Submissions */}
            <button
              onClick={() => router.push("/admin/submissions")}
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
                  <p className="mt-2 text-xs text-gray-400">Need review</p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
              </div>
            </button>

            {/* Total Notes */}
            <button
              onClick={() => router.push("/admin/resources")}
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

            {/* Total Question Papers */}
            <button
              onClick={() => router.push("/admin/resources")}
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Question Papers
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

            {/* Total Assignments */}
            <button
              onClick={() => router.push("/admin/resources")}
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Assignments
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

            {/* Total Videos */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Videos
                  </p>
                  <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {videosCount}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    YouTube links uploaded by admins
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <Video className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Super admin overview */}
          {isSuperAdmin && userCounts && (
            <>
              <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">
                Users
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {[
                  {
                    label: "Students",
                    value: userCounts.students,
                    note: "Registered students",
                  },
                  {
                    label: "Programme Admins",
                    value: userCounts.programmeAdmins,
                    note: "Assigned to a programme",
                  },
                  {
                    label: "Deactivated",
                    value: userCounts.deactivated,
                    note: "Cannot log in",
                  },
                ].map((card) => (
                  <button
                    key={card.label}
                    onClick={() => router.push("/admin/users")}
                    className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          {card.label}
                        </p>
                        <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                          {card.value}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          {card.note}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">
                Programmes
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Programme</th>
                      <th className="px-5 py-3 font-medium">
                        Pending submissions
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Programme admin
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {programmeOverview.map((programme) => (
                      <tr key={programme.id}>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {programme.name}
                        </td>

                        <td className="px-5 py-3">
                          {programme.pending > 0 ? (
                            <button
                              onClick={() =>
                                router.push("/admin/submissions")
                              }
                              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                            >
                              {programme.pending} pending
                            </button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>

                        <td className="px-5 py-3">
                          {programme.admins.length > 0 ? (
                            <span className="text-gray-700">
                              {programme.admins.join(", ")}
                            </span>
                          ) : (
                            <button
                              onClick={() => router.push("/admin/users")}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              None — assign one
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
