"use client";

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
  roleLabel,
} from "@/lib/roles";

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

// Badge colour per role (lib/roles.ts has the codes).
const ROLE_BADGE: Record<string, string> = {
  [ROLES.student]: "bg-gray-100 text-gray-700",
  [ROLES.programmeAdmin]: "bg-blue-100 text-blue-700",
  [ROLES.superAdmin]: "bg-purple-100 text-purple-700",
};

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
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Loading users...</p>
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

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    // text-gray-900: otherwise text takes the near-white dark-mode colour
    // from globals.css (same fix as the Modules page).
    <main className="min-h-screen bg-gray-50 px-8 py-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-3 text-sm text-blue-600 hover:underline"
          >
            ← Back to Admin Dashboard
          </button>

          <p className="text-sm font-medium text-blue-600">User Management</p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">Users</h1>

          <p className="mt-2 text-gray-500">
            Assign programme admins, change user roles and deactivate
            accounts. Everyone signs up as a student.
          </p>
        </div>

        {/* Error */}
        {error && !editingUser && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* User list */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">User List</h2>

            <p className="mt-1 text-sm text-gray-500">
              {visibleUsers.length} of {users.length} user
              {users.length !== 1 ? "s" : ""}
            </p>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-64"
              />

              <select
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
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {visibleUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No users match these filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleUsers.map((user) => {
                const isMe = user.id === myId;

                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    {/* User information */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {user.full_name}
                          {isMe && (
                            <span className="ml-1 font-normal text-gray-400">
                              (you)
                            </span>
                          )}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {roleLabel(user.role)}
                        </span>

                        {!user.is_active && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            Deactivated
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-600">
                        {user.email}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {user.programme?.name ??
                          (isSuperAdminRole(user.role)
                            ? "All programmes"
                            : "No programme")}
                      </p>
                    </div>

                    {/* Actions: never on your own account (backend blocks it too) */}
                    {!isMe && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openChangeRole(user)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Change role
                        </button>

                        {user.is_active ? (
                          <button
                            onClick={() => handleSetActive(user, false)}
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetActive(user, true)}
                            className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Change role window */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSaveRole}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Change role
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {editingUser.full_name} · {editingUser.email}
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <label className="mb-2 mt-5 block text-sm font-medium text-gray-700">
              Role
            </label>

            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            {needsProgramme ? (
              <>
                <label className="mb-2 mt-4 block text-sm font-medium text-gray-700">
                  Programme
                </label>

                <select
                  value={formProgrammeId}
                  onChange={(e) => setFormProgrammeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {formRole === ROLES.programmeAdmin && (
                  <p className="mt-2 text-xs text-gray-500">
                    They will review submissions and manage resources for this
                    programme.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-700">
                A super admin manages every programme, users and modules.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeChangeRole}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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