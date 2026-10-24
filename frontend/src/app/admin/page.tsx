"use client";

// Admin dashboard (/admin) — one page, two views:
//   programme admin: own programme's numbers + "Waiting for your review"
//   super admin: all programmes, users, review history, programmes table
// Part 12: redesigned with the theme (navy numbers, type-coloured icons) and
// two new pieces from the design:
//   - "Waiting for review": the oldest pending submissions with
//     "waiting X days" (from GET /api/submissions?status=pending — the same
//     backend call /admin/submissions uses; it also gives the student's name)
//   - "Needs attention" (super admin): old submissions, programmes with no
//     programme admin
// The counting code is unchanged.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertTriangle,
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
import { callBackend, readJson } from "@/lib/backend";
import { ROLES, isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { resourceTypeBadge, resourceTypeLabel } from "@/lib/resourceTypes";

// How many pending submissions the "Waiting for review" panel lists.
const WAITING_LIST_LIMIT = 5;
// A submission waiting this many days or more is highlighted.
const LATE_AFTER_DAYS = 3;
// ...and this many days or more counts as "needs attention" (super admin).
const ATTENTION_AFTER_DAYS = 7;

// One pending submission, as GET /api/submissions returns it.
type PendingItem = {
  id: number;
  title: string;
  type: string;
  created_at: string;
  programme: { name: string } | null;
  submitter: { full_name: string | null } | null;
};

// Whole days since a date ("2026-10-08T…" -> 16).
function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

// "8 Oct" — short date for the waiting list.
function shortDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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
  // Pending submissions, oldest first (for "Waiting for review").
  const [waiting, setWaiting] = useState<PendingItem[]>([]);

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
              callBackend(`${BACKEND_URL}/api/stats/overview`, {
                headers: authHeaders,
              }),

              callBackend(`${BACKEND_URL}/api/users`, {
                headers: authHeaders,
              }),

              // Pending submissions per programme, for the table below.
              supabase
                .from("resource_submissions")
                .select("programme_id")
                .eq("status", "pending"),
            ]);

          const statsData = await readJson(statsResponse);
          if (!statsResponse.ok) {
            throw new Error(
              statsData.message || "Failed to load statistics."
            );
          }

          const usersData = await readJson(usersResponse);
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

        /*
         * Both roles: the pending submissions themselves, for the
         * "Waiting for review" panel. The backend limits a programme admin
         * to their own programme. If this call fails, the panel just stays
         * empty — the rest of the dashboard still shows.
         */
        const {
          data: { session: listSession },
        } = await supabase.auth.getSession();

        try {
          const pendingResponse = await callBackend(
            `${BACKEND_URL}/api/submissions?status=pending`,
            { headers: { Authorization: `Bearer ${listSession?.access_token}` } }
          );
          const pendingData = await readJson(pendingResponse);

          if (pendingResponse.ok) {
            const items: PendingItem[] = pendingData.submissions || [];
            // The backend sends newest first; the panel wants oldest first.
            items.sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            setWaiting(items);
          } else {
            console.error("WAITING LIST ERROR:", pendingData.message);
          }
        } catch (listError) {
          console.error("WAITING LIST ERROR:", listError);
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
      <main className="flex min-h-full items-center justify-center bg-cream p-10">
        <p className="text-sm text-ink-soft">Loading admin dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-full items-center justify-center bg-cream px-6 py-10">
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-red-700">Unable to load dashboard</h1>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isSuperAdmin = isSuperAdminRole(profile.role);
  const firstName = profile.full_name?.trim().split(" ")[0] ?? "";

  // ---- "Needs attention" (super admin) ----------------------------------
  const oldSubmissions = waiting.filter((s) => daysSince(s.created_at) >= ATTENTION_AFTER_DAYS);
  const programmesWithoutAdmin = programmeOverview.filter((p) => p.admins.length === 0);

  // ---- Shared pieces -------------------------------------------------------

  // A white stat card that links somewhere. iconClass colours the icon box
  // (type cards use their badge colour from lib/resourceTypes.ts).
  function statCard(card: {
    label: string;
    value: string | number;
    note: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass?: string;
  }) {
    const Icon = card.icon;
    return (
      <Link
        key={card.label}
        href={card.href}
        className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy/40"
      >
        <div>
          <p className="text-sm font-medium text-ink-soft">{card.label}</p>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy">{card.value}</p>
          <p className="mt-1 text-xs text-ink-soft">{card.note}</p>
        </div>
        <span className={`rounded-xl p-3 ${card.iconClass ?? "bg-sky-tint text-navy"}`}>
          <Icon className="h-5 w-5" />
        </span>
      </Link>
    );
  }

  // Same look, but not a link (review history).
  function infoCard(label: string, value: string, note: string, Icon: React.ComponentType<{ className?: string }>) {
    return (
      <div key={label} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5">
        <div>
          <p className="text-sm font-medium text-ink-soft">{label}</p>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy">{value}</p>
          <p className="mt-1 text-xs text-ink-soft">{note}</p>
        </div>
        <span className="rounded-xl bg-sky-tint p-3 text-navy">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    );
  }

  const sectionTitle = "mb-4 mt-10 text-[19px] font-bold text-navy";

  return (
    <main className="min-h-full bg-cream text-ink">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        {/* ---- Welcome ---- */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted-blue">
              {isSuperAdmin ? "All programmes · Super admin" : programmeName}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-base text-ink-soft">
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
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border-[1.5px] border-sky-line bg-white px-3 text-sm font-semibold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40"
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
                className="relative flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-sky-line bg-white text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40"
              >
                <Bell className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-ink ring-2 ring-cream">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-14 z-30 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold text-navy">Notifications</h2>
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-gold-tint px-2.5 py-1 text-xs font-bold text-gold-ink">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                  {pendingCount > 0 ? (
                    <Link
                      href="/admin/submissions"
                      className="mt-3 block rounded-xl bg-cream p-3 transition hover:bg-sky-wash"
                    >
                      <p className="text-sm font-semibold text-ink">Student submissions need review</p>
                      <p className="mt-1 text-xs leading-5 text-ink-soft">
                        {pendingCount} {pendingCount === 1 ? "resource is" : "resources are"} waiting for approval.
                      </p>
                      <span className="mt-2 inline-block text-xs font-bold text-navy-soft">Review submissions →</span>
                    </Link>
                  ) : (
                    <p className="mt-3 rounded-xl bg-cream p-3 text-sm text-ink-soft">
                      You’re all caught up. No pending submissions to review.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/admin/resources"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-navy px-4 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="text-lg leading-none">+</span>
              Add resource
            </Link>
          </div>
        </header>

        {/* ---- Super admin: needs attention ---- */}
        {isSuperAdmin && (oldSubmissions.length > 0 || programmesWithoutAdmin.length > 0) && (
          <section aria-label="Needs attention" className="mb-8 grid gap-4 md:grid-cols-2">
            {oldSubmissions.length > 0 && (
              <Link
                href="/admin/submissions"
                className="flex items-start gap-3 rounded-2xl border-[1.5px] border-gold bg-gold-tint p-5 outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy/40"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" />
                <div>
                  <p className="font-bold text-ink">
                    {oldSubmissions.length} {oldSubmissions.length === 1 ? "submission has" : "submissions have"} waited {ATTENTION_AFTER_DAYS}+ days
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Oldest: {daysSince(oldSubmissions[0].created_at)} days. Review them →
                  </p>
                </div>
              </Link>
            )}
            {programmesWithoutAdmin.length > 0 && (
              <Link
                href="/admin/users"
                className="flex items-start gap-3 rounded-2xl border-[1.5px] border-gold bg-gold-tint p-5 outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy/40"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" />
                <div>
                  <p className="font-bold text-ink">
                    {programmesWithoutAdmin.length} {programmesWithoutAdmin.length === 1 ? "programme has" : "programmes have"} no programme admin
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Their students’ uploads can only be reviewed by you. Assign admins →
                  </p>
                </div>
              </Link>
            )}
          </section>
        )}

        {/* ---- Resource numbers ---- */}
        <section aria-label="Resources" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statCard({ label: "Total Resources", value: totalResourcesCount, note: "All published resources", href: "/admin/all-resources", icon: Database })}
          {statCard({ label: "Pending Submissions", value: pendingCount, note: "Need review", href: "/admin/submissions", icon: ClipboardCheck, iconClass: "bg-gold-tint text-gold-ink" })}
          {statCard({ label: "Notes", value: notesCount, note: "Published notes", href: "/admin/all-resources?type=note", icon: FileText, iconClass: resourceTypeBadge("note") })}
          {statCard({ label: "Question Papers", value: papersCount, note: "Published papers", href: "/admin/all-resources?type=question_paper", icon: FileQuestion, iconClass: resourceTypeBadge("question_paper") })}
          {statCard({ label: "Assignments", value: assignmentsCount, note: "Published assignments", href: "/admin/all-resources?type=assignment", icon: ClipboardList, iconClass: resourceTypeBadge("assignment") })}
          {statCard({ label: "Videos", value: videosCount, note: "YouTube links added by admins", href: "/admin/all-resources?type=video", icon: Video, iconClass: resourceTypeBadge("video") })}
        </section>

        {/* ---- Waiting for review (both roles) ---- */}
        <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[19px] font-bold text-navy">
              {isSuperAdmin ? "Waiting for review" : "Waiting for your review"}
            </h2>
            <span className="rounded-full bg-gold-tint px-3 py-1 text-sm font-bold text-gold-ink">
              {waiting.length} pending
            </span>
          </div>

          {waiting.length === 0 ? (
            <p className="rounded-xl bg-cream p-4 text-sm text-ink-soft">
              All caught up — nothing is waiting for review.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {waiting.slice(0, WAITING_LIST_LIMIT).map((item) => {
                const days = daysSince(item.created_at);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-cream p-3 sm:flex-nowrap"
                  >
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${resourceTypeBadge(item.type)}`}>
                      {resourceTypeLabel(item.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{item.title}</p>
                      <p className="text-sm text-ink-soft">
                        by {item.submitter?.full_name || "a deleted account"}
                        {isSuperAdmin && item.programme ? ` · ${item.programme.name}` : ""} · {shortDate(item.created_at)}
                        {" · "}
                        {/* Old ones stand out in dark gold */}
                        <span className={days >= LATE_AFTER_DAYS ? "font-bold text-gold-ink" : ""}>
                          {days === 0 ? "today" : `waiting ${days} ${days === 1 ? "day" : "days"}`}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {waiting.length > 0 && (
            <Link
              href="/admin/submissions"
              className="mt-4 inline-block rounded text-[15px] font-bold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
            >
              {waiting.length > WAITING_LIST_LIMIT
                ? `Open all ${waiting.length} pending submissions →`
                : "Review them →"}
            </Link>
          )}
        </section>

        {/* ---- Super admin overview ---- */}
        {isSuperAdmin && userCounts && (
          <>
            <h2 className={sectionTitle}>Users</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statCard({ label: "Students", value: userCounts.students, note: "Registered students", href: "/admin/users", icon: Users })}
              {statCard({ label: "Programme Admins", value: userCounts.programmeAdmins, note: "Assigned to a programme", href: "/admin/users", icon: Users })}
              {statCard({ label: "Deactivated", value: userCounts.deactivated, note: "Cannot log in", href: "/admin/users", icon: Users })}
            </div>

            {reviewCounts && (
              <>
                <h2 className={sectionTitle}>Review history</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {infoCard("Approved", String(reviewCounts.approved), "Published for students", CheckCircle2)}
                  {infoCard("Rejected", String(reviewCounts.rejected), "Sent back with a reason", XCircle)}
                  {infoCard(
                    "Approval rate",
                    // Approved out of everything already reviewed.
                    reviewCounts.approved + reviewCounts.rejected > 0
                      ? `${Math.round((reviewCounts.approved / (reviewCounts.approved + reviewCounts.rejected)) * 100)}%`
                      : "—",
                    "Of reviewed submissions",
                    Percent
                  )}
                </div>
              </>
            )}

            <h2 className={sectionTitle}>Programmes</h2>
            {/* overflow-x-auto: on a phone the table scrolls inside its box */}
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line font-display text-xs uppercase tracking-wide text-muted-blue">
                  <tr>
                    <th className="px-5 py-3 font-bold">Programme</th>
                    <th className="px-5 py-3 font-bold">Resources</th>
                    <th className="px-5 py-3 font-bold">Pending submissions</th>
                    <th className="px-5 py-3 font-bold">Programme admin</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-line">
                  {programmeOverview.map((programme) => (
                    <tr key={programme.id} className="hover:bg-cream">
                      <td className="px-5 py-3 font-semibold text-ink">{programme.name}</td>
                      <td className="px-5 py-3">
                        <span className={programme.resources > 0 ? "font-semibold text-ink" : "text-ink-soft"}>
                          {programme.resources}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {programme.pending > 0 ? (
                          <Link
                            href="/admin/submissions"
                            className="rounded-full bg-gold-tint px-2.5 py-1 text-xs font-bold text-gold-ink hover:bg-gold/40"
                          >
                            {programme.pending} pending
                          </Link>
                        ) : (
                          <span className="text-ink-soft">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {programme.admins.length > 0 ? (
                          <span className="text-ink">{programme.admins.join(", ")}</span>
                        ) : (
                          // Quiet grey text + a small outlined button: with
                          // 9 of 10 programmes unassigned, ten bright links
                          // in a column were too loud.
                          <span className="flex items-center gap-3">
                            <span className="text-ink-soft">Not assigned</span>
                            <Link
                              href="/admin/users"
                              aria-label={`Assign a programme admin for ${programme.name}`}
                              className="rounded-lg border-[1.5px] border-sky-line bg-white px-3 py-1 text-xs font-bold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40"
                            >
                              Assign
                            </Link>
                          </span>
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