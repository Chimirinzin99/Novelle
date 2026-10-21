"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  FileQuestion,
  ClipboardList,
  Bell,
  ArrowLeft,
  Video,
  Database,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { ROLES, isAdminRole, isSuperAdminRole } from "@/lib/roles";

type ProgrammeOverview = {
  id: number;
  name: string;
  resources: number;
  pending: number;
  admins: string[];
};

// Shape of GET /api/stats/overview (backend/src/controllers/stats.controller.ts).
type OverviewStats = {
  totalResources: number;
  resourcesByType: Record<string, number>;
  submissionsByStatus: Record<string, number>;
  resourcesByProgramme: {
    programme_id: number;
    name: string;
    short_name: string;
    resources: number;
  }[];
};

type ReviewCounts = {
  approved: number;
  rejected: number;
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [papersCount, setPapersCount] = useState(0);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);
  const [totalResourcesCount, setTotalResourcesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userCounts, setUserCounts] = useState<UserCounts | null>(null);
  const [reviewCounts, setReviewCounts] = useState<ReviewCounts | null>(null);
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
         * Counts come from the backend:
         *   GET /api/stats/overview  -> resource + submission counts
         *   GET /api/users           -> user counts and programme admins
         * The backend counts with the service-role key, so the browser
         * doesn't need permission to read every row itself.
         * Pending submissions per programme are still read here
         * (RLS already lets a super admin see every submission).
         */
        if (isSuperAdmin) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const authHeaders = {
            Authorization: `Bearer ${session?.access_token}`,
          };

          const [statsResponse, usersResponse, pendingRowsResult] =
            await Promise.all([
              fetch(`${BACKEND_URL}/api/stats/overview`, {
                headers: authHeaders,
              }),

              fetch(`${BACKEND_URL}/api/users`, {
                headers: authHeaders,
              }),

              // Pending submissions per programme, for the table below.
              supabase
                .from("resource_submissions")
                .select("programme_id")
                .eq("status", "pending"),
            ]);

          const statsData = await statsResponse.json();
          if (!statsResponse.ok) {
            throw new Error(
              statsData.message || "Failed to load statistics."
            );
          }

          const usersData = await usersResponse.json();
          if (!usersResponse.ok) {
            throw new Error(usersData.message || "Failed to load users.");
          }

          if (pendingRowsResult.error) {
            console.error(
              "PROGRAMME PENDING ERROR:",
              pendingRowsResult.error
            );
          }

          // Resource and submission counts
          const stats: OverviewStats = statsData.stats;

          setTotalResourcesCount(stats.totalResources);
          setNotesCount(stats.resourcesByType.note ?? 0);
          setPapersCount(stats.resourcesByType.question_paper ?? 0);
          setAssignmentsCount(stats.resourcesByType.assignment ?? 0);
          setVideosCount(stats.resourcesByType.video ?? 0);
          setPendingCount(stats.submissionsByStatus.pending ?? 0);
          setReviewCounts({
            approved: stats.submissionsByStatus.approved ?? 0,
            rejected: stats.submissionsByStatus.rejected ?? 0,
          });

          // User counts
          const users: {
            full_name: string;
            role: string;
            programme_id: number | null;
            is_active: boolean;
          }[] = usersData.users || [];

          setUserCounts({
            students: users.filter((u) => u.role === ROLES.student).length,
            programmeAdmins: users.filter(
              (u) => u.role === ROLES.programmeAdmin
            ).length,
            deactivated: users.filter((u) => !u.is_active).length,
          });

          // Programme table: resources, pending submissions, admins
          const pendingRows = pendingRowsResult.data || [];

          setProgrammeOverview(
            stats.resourcesByProgramme.map((programme) => ({
              id: programme.programme_id,
              name: programme.name,
              resources: programme.resources,

              pending: pendingRows.filter(
                (row) => row.programme_id === programme.programme_id
              ).length,

              admins: users
                .filter(
                  (u) =>
                    u.role === ROLES.programmeAdmin &&
                    u.is_active &&
                    u.programme_id === programme.programme_id
                )
                .map((u) => u.full_name),
            }))
          );
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
    <main className="min-h-full bg-slate-50 text-gray-900">
      <div className="w-full px-5 py-6 md:px-8 md:py-8 lg:px-10">
          {/* Welcome */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
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

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                aria-label="Back to Novelle site"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to site</span>
              </button>
              <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Notifications${pendingCount ? `, ${pendingCount} pending submissions` : ""}`}
                aria-expanded={notificationsOpen}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Bell className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-14 z-30 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold text-gray-900">Notifications</h2>
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                  {pendingCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => router.push("/admin/submissions")}
                      className="mt-3 w-full rounded-xl bg-slate-50 p-3 text-left transition hover:bg-blue-50"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        Student submissions need review
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {pendingCount} {pendingCount === 1 ? "resource is" : "resources are"} waiting for approval.
                      </p>
                      <span className="mt-2 inline-block text-xs font-semibold text-blue-700">Review submissions</span>
                    </button>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-gray-500">
                      You’re all caught up. No pending submissions to review.
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
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
              onClick={() => router.push("/admin/all-resources")}
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
              onClick={() => router.push("/admin/all-resources?type=note")}
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
              onClick={() => router.push("/admin/all-resources?type=question_paper")}
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
              onClick={() => router.push("/admin/all-resources?type=assignment")}
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
            <button
              type="button"
              onClick={() => router.push("/admin/all-resources?type=video")}
              className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
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
            </button>
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

              {reviewCounts && (
                <>
                  <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">
                    Review history
                  </h2>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {[
                      {
                        label: "Approved",
                        value: String(reviewCounts.approved),
                        note: "Published for students",
                        icon: CheckCircle2,
                      },
                      {
                        label: "Rejected",
                        value: String(reviewCounts.rejected),
                        note: "Sent back with a reason",
                        icon: XCircle,
                      },
                      {
                        label: "Approval rate",
                        // Approved out of everything already reviewed.
                        value:
                          reviewCounts.approved + reviewCounts.rejected > 0
                            ? `${Math.round(
                                (reviewCounts.approved /
                                  (reviewCounts.approved +
                                    reviewCounts.rejected)) *
                                  100
                              )}%`
                            : "—",
                        note: "Of reviewed submissions",
                        icon: Percent,
                      },
                    ].map(({ label, value, note, icon: Icon }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {label}
                            </p>
                            <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                              {value}
                            </p>
                            <p className="mt-2 text-xs text-gray-400">
                              {note}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">
                Programmes
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Programme</th>
                      <th className="px-5 py-3 font-medium">Resources</th>
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
                          {programme.resources > 0 ? (
                            <span className="font-medium text-gray-900">
                              {programme.resources}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
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
    </main>
  );
}