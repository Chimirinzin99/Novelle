"use client";

// Part 12: hard-coded colours (gray/blue/black and old hexes) switched to the
// theme colours from app/globals.css (navy, ink, line, sky-…, gold-…).
// Nothing else on this page changed.
// Part 21 (option B): users grouped by programme (super admins first), each
// group heading counts admins / lecturers / students and warns when a
// programme has no programme admin yet; roles shown as an icon + word, not
// pills. "Lecturer" is worked out from the email (a name, not a student ID —
// lib/cstEmail.ts); in the database they are students until made an admin.
// How the page works (Change role window, Deactivate confirm, nothing on
// your own row) is unchanged.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import {
  ROLES,
  ROLE_OPTIONS,
  isAdminRole,
  isSuperAdminRole,
} from "@/lib/roles";
import { isStaffEmail } from "@/lib/cstEmail";

// One row from GET /api/users (backend/src/controllers/users.controller.ts).
type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  programme_id: number | null;
  is_active: boolean;
  created_at: string;
  programme: { name: string; short_name: string | null } | null;
};

type Programme = {
  id: number;
  name: string;
};

// Part 21: role shown as an icon + word. "lecturer" is not a real role: it
// is a student account with a name-style CST email (see isStaffEmail).
type RoleMarkKind = "super_admin" | "programme_admin" | "lecturer" | "student";

const ROLE_MARKS: Record<RoleMarkKind, { label: string; className: string; paths: string[] }> = {
  super_admin: {
    label: "Super admin",
    className: "text-gold-ink",
    paths: ["M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"],
  },
  programme_admin: {
    label: "Programme admin",
    className: "text-navy-soft",
    paths: ["M8 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M11 12l9-9M17 6l3 3"],
  },
  lecturer: {
    label: "Lecturer",
    className: "text-green-700",
    paths: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 21V5"],
  },
  student: {
    label: "Student",
    className: "text-ink-soft",
    paths: ["M2 9l10-5 10 5-10 5z", "M6 11v5c3 2 9 2 12 0v-5"],
  },
};

function roleMarkKind(user: { role: string; email: string }): RoleMarkKind {
  if (isSuperAdminRole(user.role)) return "super_admin";
  if (user.role === ROLES.programmeAdmin) return "programme_admin";
  return isStaffEmail(user.email) ? "lecturer" : "student";
}

function RoleMark({ kind }: { kind: RoleMarkKind }) {
  const mark = ROLE_MARKS[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold ${mark.className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {mark.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {mark.label}
    </span>
  );
}

// "1 admin · 2 lecturers · 30 students" (parts that are 0 are left out,
// except admins, which always show so "0 admins" is visible).
function groupSummary(users: { role: string; email: string }[]) {
  const count = (kind: RoleMarkKind) => users.filter((u) => roleMarkKind(u) === kind).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const admins = count("programme_admin");
  const lecturers = count("lecturer");
  const students = count("student");
  return [
    plural(admins, "admin"),
    lecturers ? plural(lecturers, "lecturer") : null,
    students ? plural(students, "student") : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function UsersPage() {
  const router = useRouter();

  const [myId, setMyId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters above the list ("" = all)
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // "Change role" window: the user being changed + the form values
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formRole, setFormRole] = useState("");
  const [formProgrammeId, setFormProgrammeId] = useState("");

  // ------------------------------------
  // Logged-in session (the token goes to the backend)
  // ------------------------------------

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return null;
    }

    return session;
  };

  // ------------------------------------
  // Load users through the backend
  // ------------------------------------

  const loadUsers = async () => {
    const session = await getSession();

    if (!session) {
      return;
    }

    const response = await callBackend(`${BACKEND_URL}/api/users`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load users.");
    }

    setUsers(data.users || []);
  };

  // ------------------------------------
  // Initial page load: super admin only
  // ------------------------------------

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        // lib/roles.ts decides who counts as an admin / super admin.
        // Students go home; programme admins go back to the dashboard.
        if (!isAdminRole(profileData?.role)) {
          router.push("/home");
          return;
        }

        if (!isSuperAdminRole(profileData?.role)) {
          router.push("/admin");
          return;
        }

        setMyId(user.id);

        const { data: programmeList } = await supabase
          .from("programmes")
          .select("id, name")
          .order("name");

        setProgrammes(programmeList || []);

        await loadUsers();
      } catch (error) {
        console.error(error);
        setError(
          error instanceof Error ? error.message : "Failed to load users."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once (and if the router changes), not on every render
  }, [router]);

  // ------------------------------------
  // Change role window
  // ------------------------------------

  const openChangeRole = (user: User) => {
    setEditingUser(user);
    setFormRole(user.role);
    setFormProgrammeId(user.programme_id ? String(user.programme_id) : "");
    setError("");
    setSuccess("");
  };

  const closeChangeRole = () => {
    setEditingUser(null);
  };

  // A super admin has no programme; the other two roles need one.
  const needsProgramme = formRole !== ROLES.superAdmin;

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) {
      return;
    }

    if (needsProgramme && !formProgrammeId) {
      setError("Please select a programme.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const session = await getSession();

      if (!session) {
        return;
      }

      const response = await callBackend(
        `${BACKEND_URL}/api/users/${editingUser.id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            role: formRole,
            programme_id: needsProgramme ? Number(formProgrammeId) : null,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update role.");
      }

      setSuccess(data.message || "Role updated.");
      closeChangeRole();
      await loadUsers();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Failed to update role."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------
  // Deactivate / reactivate
  // Backend sets profiles.is_active AND bans/unbans the login.
  // ------------------------------------

  const handleSetActive = async (user: User, active: boolean) => {
    setError("");
    setSuccess("");

    if (
      !active &&
      !window.confirm(
        `Deactivate ${user.full_name}? They will not be able to log in until you reactivate them. Their uploads, submissions and likes are kept.`
      )
    ) {
      return;
    }

    try {
      const session = await getSession();

      if (!session) {
        return;
      }

      const response = await callBackend(
        `${BACKEND_URL}/api/users/${user.id}/${active ? "activate" : "deactivate"}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update account.");
      }

      setSuccess(data.message || "Account updated.");
      await loadUsers();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Failed to update account."
      );
    }
  };

  // ------------------------------------
  // Loading screen
  // ------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream text-ink">
        <p className="text-ink-soft">Loading users...</p>
      </main>
    );
  }

  // ------------------------------------
  // Filtering (all in the browser: the list is small)
  // ------------------------------------

  const searchText = search.trim().toLowerCase();

  const visibleUsers = users.filter((user) => {
    if (
      searchText &&
      !user.full_name.toLowerCase().includes(searchText) &&
      !user.email.toLowerCase().includes(searchText)
    ) {
      return false;
    }

    if (roleFilter && user.role !== roleFilter) return false;

    if (programmeFilter && user.programme_id !== Number(programmeFilter)) {
      return false;
    }

    if (statusFilter === "active" && !user.is_active) return false;
    if (statusFilter === "deactivated" && user.is_active) return false;

    return true;
  });

  const hasFilters = search || roleFilter || programmeFilter || statusFilter;

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setProgrammeFilter("");
    setStatusFilter("");
  };

  // Part 21: one group per programme, super admins first; programmes with
  // no users (after filtering) are left out.
  const superAdmins = visibleUsers.filter((u) => isSuperAdminRole(u.role));
  const programmeGroups = programmes
    .map((programme) => ({
      programme,
      users: visibleUsers.filter(
        (u) => !isSuperAdminRole(u.role) && u.programme_id === programme.id
      ),
    }))
    .filter((group) => group.users.length > 0);
  const noProgramme = visibleUsers.filter(
    (u) => !isSuperAdminRole(u.role) && !programmes.some((p) => p.id === u.programme_id)
  );

  // Summary line over all users (not only the filtered ones).
  const totals = {
    superAdmins: users.filter((u) => roleMarkKind(u) === "super_admin").length,
    admins: users.filter((u) => roleMarkKind(u) === "programme_admin").length,
    lecturers: users.filter((u) => roleMarkKind(u) === "lecturer").length,
    students: users.filter((u) => roleMarkKind(u) === "student").length,
    deactivated: users.filter((u) => !u.is_active).length,
  };

  const selectClass =
    "h-11 rounded-md border-[1.5px] border-sky-line bg-white px-3 text-[15px] outline-none focus:border-navy";

  // One user row: name + email, role, actions (never on your own account —
  // the backend blocks it too).
  const renderRow = (user: User) => {
    const isMe = user.id === myId;
    return (
      <li
        key={user.id}
        className="flex flex-col gap-3 border-t border-line px-5 py-3.5 md:flex-row md:items-center md:gap-5"
      >
        <div className={`min-w-0 flex-1 ${user.is_active ? "" : "opacity-60"}`}>
          <p className="flex flex-wrap items-center gap-x-2.5 font-display font-bold text-ink">
            {user.full_name}
            {isMe && <span className="font-sans font-normal text-ink-soft">(you)</span>}
            {!user.is_active && (
              <span className="inline-flex items-center gap-1 font-sans text-[13px] font-bold text-red-700">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                  <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
                </svg>
                Deactivated
              </span>
            )}
          </p>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
        </div>

        <div className={`md:w-44 ${user.is_active ? "" : "opacity-60"}`}>
          <RoleMark kind={roleMarkKind(user)} />
        </div>

        <div className="flex items-center gap-4 md:w-64 md:justify-end">
          {isMe ? (
            <span className="text-sm text-ink-soft">This is you</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openChangeRole(user)}
                className="h-10 rounded-md border-[1.5px] border-navy bg-white px-4 text-sm font-bold text-navy transition hover:bg-sky-wash"
              >
                Change role
              </button>
              {user.is_active ? (
                <button
                  type="button"
                  onClick={() => handleSetActive(user, false)}
                  className="text-sm font-bold text-red-700 underline underline-offset-[3px]"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetActive(user, true)}
                  className="text-sm font-bold text-green-700 underline underline-offset-[3px]"
                >
                  Reactivate
                </button>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

  // One box per group, with a heading row.
  const renderGroup = (key: string, title: string, sub: string, rows: User[], warn?: string) => (
    <section key={key} className="overflow-hidden rounded-md border-[1.5px] border-card-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-sky-line bg-sky-wash px-5 py-3">
        <h2 className="flex-1 font-display text-[17px] font-bold text-navy">
          {title} <span className="font-sans text-sm font-semibold text-ink-soft">{sub}</span>
        </h2>
        {warn && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gold-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            {warn}
          </span>
        )}
      </div>
      <ul className="-mt-px">{rows.map(renderRow)}</ul>
    </section>
  );

  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-ink sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Users</h1>
          <p className="mt-2 text-ink-soft">
            Everyone signs up as a student. Make someone a programme admin here,
            or deactivate an account (accounts are never deleted).
          </p>
        </div>

        <p className="text-base text-ink">
          <strong>
            {users.length} {users.length === 1 ? "user" : "users"}:
          </strong>
          {` ${totals.superAdmins} super admin${totals.superAdmins === 1 ? "" : "s"}`}
          {`, ${totals.admins} programme admin${totals.admins === 1 ? "" : "s"}`}
          {totals.lecturers > 0 && `, ${totals.lecturers} lecturer${totals.lecturers === 1 ? "" : "s"}`}
          {`, ${totals.students} student${totals.students === 1 ? "" : "s"}`}
          {totals.deactivated > 0 && (
            <span className="font-bold text-red-700">, {totals.deactivated} deactivated</span>
          )}
        </p>

        {/* Error */}
        {error && !editingUser && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="user-search">Search name or email</label>
          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="h-11 w-full rounded-md border-[1.5px] border-sky-line bg-white px-3 text-[15px] outline-none focus:border-navy sm:w-72"
          />

          <select
            aria-label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Programme"
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-navy underline underline-offset-[3px]"
            >
              Clear filters
            </button>
          )}
        </div>

        {visibleUsers.length === 0 ? (
          <div className="rounded-md border-[1.5px] border-dashed border-sky-line bg-white px-6 py-10 text-ink-soft">
            No users match these filters.
          </div>
        ) : (
          <>
            {superAdmins.length > 0 &&
              renderGroup(
                "super",
                "Super admins",
                `${superAdmins.length}, all programmes`,
                superAdmins
              )}
            {programmeGroups.map(({ programme, users: rows }) =>
              renderGroup(
                String(programme.id),
                programme.name,
                groupSummary(rows),
                rows,
                // warn only when the whole programme (not just this filter) has no admin
                users.some(
                  (u) => u.role === ROLES.programmeAdmin && u.programme_id === programme.id
                )
                  ? undefined
                  : "No programme admin yet"
              )
            )}
            {noProgramme.length > 0 &&
              renderGroup("none", "No programme", groupSummary(noProgramme), noProgramme)}
            <p className="text-sm text-ink-soft">
              Programmes with no users are hidden. &ldquo;Lecturer&rdquo; means a CST email with a
              name instead of a student ID; make them a programme admin with Change role.
            </p>
          </>
        )}
      </div>

      {/* Change role window */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 dark:bg-black/70">
          <form
            onSubmit={handleSaveRole}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-ink">
              Change role
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              {editingUser.full_name} ({editingUser.email})
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <label className="mb-2 mt-5 block text-sm font-medium text-ink-nav">
              Role
            </label>

            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full rounded-lg border border-sky-line bg-white px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            {needsProgramme ? (
              <>
                <label className="mb-2 mt-4 block text-sm font-medium text-ink-nav">
                  Programme
                </label>

                <select
                  value={formProgrammeId}
                  onChange={(e) => setFormProgrammeId(e.target.value)}
                  className="w-full rounded-lg border border-sky-line bg-white px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
                >
                  <option value="">Select programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {formRole === ROLES.programmeAdmin && (
                  <p className="mt-2 text-xs text-ink-soft">
                    They will review submissions and manage resources for this
                    programme.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-gold-tint px-4 py-3 text-sm text-gold-ink">
                A super admin manages every programme, users and modules.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeChangeRole}
                disabled={saving}
                className="rounded-lg border border-sky-line bg-white px-5 py-2.5 text-sm font-medium text-ink-nav hover:bg-cream disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
