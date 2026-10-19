"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import {
  isAdminRole,
  isProgrammeAdminRole,
  isSuperAdminRole,
} from "@/lib/roles";

type Profile = {
  id: string;
  programme_id: number | null;
  role: string;
};

type Module = {
  id: number;
  programme_id: number;
  module_code: string;
  module_name: string;
  year: number;
  semester: number;
  active: boolean;
};

// Only needed by the super admin (programme dropdown + programme names).
type Programme = {
  id: number;
  name: string;
};

export default function ModulesPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [programmeName, setProgrammeName] = useState("");
  const [modules, setModules] = useState<Module[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  // Super admin only: programme list, the programme a NEW module goes to,
  // and the programme filter above the module list ("" = all programmes).
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [formProgrammeId, setFormProgrammeId] = useState("");
  const [listProgrammeId, setListProgrammeId] = useState("");

  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

  // ------------------------------------
  // Get logged-in session
  // ------------------------------------

  const getSession = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      router.push("/login");
      return null;
    }

    return session;
  };

  // ------------------------------------
  // Load profile
  // ------------------------------------

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return null;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, programme_id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profileData) {
      throw new Error(
        "Your profile could not be found."
      );
    }

    // Check admin role
    // lib/roles.ts decides who counts as an admin.
    if (!isAdminRole(profileData.role)) {
      router.push("/home");
      return null;
    }

    setProfile(profileData);

    // Get programme name
    if (profileData.programme_id) {
      const { data: programmeData } = await supabase
        .from("programmes")
        .select("name")
        .eq("id", profileData.programme_id)
        .maybeSingle();

      if (programmeData) {
        setProgrammeName(programmeData.name);
      }
    }

    // The super admin works across programmes, so load the programme list.
    if (isSuperAdminRole(profileData.role)) {
      const { data: programmeList } = await supabase
        .from("programmes")
        .select("id, name")
        .order("name");

      setProgrammes(programmeList || []);
    }

    return profileData;
  };

  // ------------------------------------
  // Load modules through backend
  // ------------------------------------

  const loadModules = async () => {
    const session = await getSession();

    if (!session) {
      return;
    }

    const response = await fetch(
      `${BACKEND_URL}/api/modules`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load modules."
      );
    }

    setModules(data.modules || []);
  };

  // ------------------------------------
  // Initial page load
  // ------------------------------------

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const profileData = await loadProfile();

        if (!profileData) {
          return;
        }

        await loadModules();
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load modules."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [router]);

  // ------------------------------------
  // Clear form
  // ------------------------------------

  const clearForm = () => {
    setEditingId(null);
    setModuleCode("");
    setModuleName("");
    setYear("");
    setSemester("");
  };

  // ------------------------------------
  // Add / Edit module
  // ------------------------------------

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!profile) {
      setError("Profile information is unavailable.");
      return;
    }

    if (editingId === null && !formProgrammeId) {
      setError("Please select a programme.");
      return;
    }

    if (!moduleCode.trim()) {
      setError("Please enter a module code.");
      return;
    }

    if (!moduleName.trim()) {
      setError("Please enter a module name.");
      return;
    }

    if (!year) {
      setError("Please select a year.");
      return;
    }

    if (!semester) {
      setError("Please select a semester.");
      return;
    }

    setSaving(true);

    try {
      const session = await getSession();

      if (!session) {
        return;
      }

      const moduleData = {
        module_code: moduleCode.trim().toUpperCase(),
        module_name: moduleName.trim(),
        year: Number(year),
        semester: Number(semester),
      };

      // ------------------------------------
      // EDIT MODULE
      // ------------------------------------

      if (editingId !== null) {
        const response = await fetch(
          `${BACKEND_URL}/api/modules/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(moduleData),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to update module."
          );
        }

        setSuccess(
          "Module updated successfully."
        );
      }

      // ------------------------------------
      // ADD MODULE
      // ------------------------------------

      else {
        const response = await fetch(
          `${BACKEND_URL}/api/modules`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              ...moduleData,
              programme_id: Number(formProgrammeId),
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to create module."
          );
        }

        setSuccess(
          "Module added successfully."
        );
      }

      clearForm();

      await loadModules();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------
  // Edit module
  // ------------------------------------

  const handleEdit = (module: Module) => {
    setEditingId(module.id);

    setModuleCode(module.module_code);
    setModuleName(module.module_name);
    setYear(String(module.year));
    setSemester(String(module.semester));
    // Shown (locked) in the form: editing doesn't move a module
    // to another programme.
    setFormProgrammeId(String(module.programme_id));

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ------------------------------------
  // Deactivate module
  // ------------------------------------

  const handleDeactivate = async (
    module: Module
  ) => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${module.module_code}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const session = await getSession();

      if (!session) {
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/modules/${module.id}/deactivate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to deactivate module."
        );
      }

      setSuccess(
        `${module.module_code} has been deactivated.`
      );

      await loadModules();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to deactivate module."
      );
    }
  };

  // ------------------------------------
  // Reactivate module
  // ------------------------------------

  const handleReactivate = async (
    module: Module
  ) => {
    setError("");
    setSuccess("");

    try {
      const session = await getSession();

      if (!session) {
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/modules/${module.id}/activate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to activate module."
        );
      }

      setSuccess(
        `${module.module_code} has been reactivated.`
      );

      await loadModules();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to reactivate module."
      );
    }
  };

  // ------------------------------------
  // Loading screen
  // ------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-8 text-gray-900 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-8 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <p className="text-gray-500">Loading modules...</p>
        </div>
      </main>
    );
  }

  // Only the super admin may add or change modules (rule in lib/roles.ts;
  // the backend enforces it too). Programme admins just view the list.
  const canManage = isSuperAdminRole(profile?.role);

  // Programme id -> name, for the labels in the super admin's list.
  const programmeNameById = (id: number) =>
    programmes.find((p) => p.id === id)?.name ?? "";

  // Modules shown in the list (super admin can filter by programme).
  const visibleModules = listProgrammeId
    ? modules.filter((m) => m.programme_id === Number(listProgrammeId))
    : modules;

  return (
    // text-gray-900: without it the text (and the form boxes, which inherit
    // it) takes the near-white dark-mode colour from globals.css.
    <main className="min-h-screen bg-gray-50 px-8 py-8 text-gray-900">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>

            <p className="text-sm font-medium text-blue-600">
              Module Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Modules
            </h1>

            {/* Heading depends on the role (helpers in lib/roles.ts) */}
            {isProgrammeAdminRole(profile?.role) && (
              <p className="mt-2 text-gray-500">
                Modules for {programmeName}. Only the super admin can add
                or change modules.
              </p>
            )}

            {isSuperAdminRole(profile?.role) && (
              <p className="mt-2 text-gray-500">
                Managing modules across all
                programmes
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
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

        {/* Add / Edit Form (super admin only) */}
        {canManage && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId !== null
                ? "Edit Module"
                : "Add Module"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the module information below.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* Programme: chosen when adding; locked when editing */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Programme
              </label>

              <select
                value={formProgrammeId}
                onChange={(e) => setFormProgrammeId(e.target.value)}
                disabled={editingId !== null}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select programme</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Code */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Module Code
              </label>

              <input
                type="text"
                value={moduleCode}
                onChange={(e) =>
                  setModuleCode(e.target.value)
                }
                placeholder="e.g. CSF101"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Module Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Module Name
              </label>

              <input
                type="text"
                value={moduleName}
                onChange={(e) =>
                  setModuleName(e.target.value)
                }
                placeholder="e.g. Programming Fundamentals"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Year */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Year
              </label>

              <select
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Select year
                </option>
                <option value="1">
                  Year 1
                </option>
                <option value="2">
                  Year 2
                </option>
                <option value="3">
                  Year 3
                </option>
                <option value="4">
                  Year 4
                </option>
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Semester
              </label>

              <select
                value={semester}
                onChange={(e) =>
                  setSemester(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Select semester
                </option>
                <option value="1">
                  Semester 1
                </option>
                <option value="2">
                  Semester 2
                </option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                  ? "Update Module"
                  : "Add Module"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={clearForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        )}

        {/* Module List */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Module List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {visibleModules.length} module
              {visibleModules.length !== 1
                ? "s"
                : ""}
            </p>

            {/* Programme filter (super admin only) */}
            {canManage && (
              <select
                value={listProgrammeId}
                onChange={(e) => setListProgrammeId(e.target.value)}
                className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All programmes</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {visibleModules.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No modules have been added yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleModules.map((module) => (
                <div
                  key={module.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  {/* Module Information */}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {module.module_code}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          module.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {module.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {module.module_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Year {module.year} ·
                      Semester{" "}
                      {module.semester}
                      {/* The super admin sees modules of every programme */}
                      {canManage &&
                        ` · ${programmeNameById(module.programme_id)}`}
                    </p>
                  </div>

                  {/* Actions (super admin only) */}
                  {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleEdit(module)
                      }
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    {module.active ? (
                      <button
                        onClick={() =>
                          handleDeactivate(
                            module
                          )
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleReactivate(
                            module
                          )
                        }
                        className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
