"use client";

// Part 12: hard-coded colours (gray/blue/black and old hexes) switched to the
// theme colours from app/globals.css (navy, ink, line, sky-…, gold-…).
// Nothing else on this page changed.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
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

// Part 21: modules grouped under "Year 1, Semester 1" headings, in order.
function moduleGroups<T extends { year: number; semester: number }>(modules: T[]) {
  const groups = new Map<string, { key: string; title: string; year: number; semester: number; modules: T[] }>();
  for (const item of modules) {
    const key = `${item.year}-${item.semester}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: `Year ${item.year}, Semester ${item.semester}`,
        year: item.year,
        semester: item.semester,
        modules: [],
      });
    }
    groups.get(key)!.modules.push(item);
  }
  return [...groups.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);
}

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

  // Part 22: the Add/Edit form box, so Edit can scroll it into view.
  // (window.scrollTo did nothing: the admin layout scrolls an inner box,
  // not the window — so Edit filled the form off-screen and looked dead.)
  const formRef = useRef<HTMLDivElement>(null);

  // Super admin only: programme list, the programme a NEW module goes to,
  // and the filters above the module list (Part 28: + year and semester,
  // same FilterBar as All Resources; the programme filter is super admin only).
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [formProgrammeId, setFormProgrammeId] = useState("");
  const [listProgramme, setListProgramme] = useState("All Programmes");
  const [listYear, setListYear] = useState("All Years");
  const [listSemester, setListSemester] = useState("All Semesters");

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

        // Part 22: a programme admin's form only offers (and is locked to)
        // their own programme.
        if (isProgrammeAdminRole(profileData.role)) {
          setProgrammes([
            { id: profileData.programme_id, name: programmeData.name },
          ]);
          setFormProgrammeId(String(profileData.programme_id));
        }
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

    const response = await callBackend(
      `${BACKEND_URL}/api/modules`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const data = await readJson(response);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once (and if the router changes), not on every render
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
        const response = await callBackend(
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

        const data = await readJson(response);

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
        const response = await callBackend(
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

        const data = await readJson(response);

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

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
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

      const response = await callBackend(
        `${BACKEND_URL}/api/modules/${module.id}/deactivate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await readJson(response);

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

      const response = await callBackend(
        `${BACKEND_URL}/api/modules/${module.id}/activate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await readJson(response);

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
      <main className="min-h-screen bg-cream px-5 py-8 text-ink md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-ink-soft">Loading modules...</p>
        </div>
      </main>
    );
  }

  // Part 22: every admin may add or change modules. Programme admins only in
  // their own programme (the backend checks that too); super admin: all.
  const canManage = isAdminRole(profile?.role);

  // Programme id -> name, for the labels in the super admin's list.
  const programmeNameById = (id: number) =>
    programmes.find((p) => p.id === id)?.name ?? "";

  // Modules shown in the list, after the Programme / Year / Semester filters.
  const visibleModules = modules.filter(
    (m) =>
      (listProgramme === "All Programmes" || programmeNameById(m.programme_id) === listProgramme) &&
      (listYear === "All Years" || `Year ${m.year}` === listYear) &&
      (listSemester === "All Semesters" || `Semester ${m.semester}` === listSemester)
  );

  function clearListFilters() {
    setListProgramme("All Programmes");
    setListYear("All Years");
    setListSemester("All Semesters");
  }

  return (
    // text-gray-900: without it the text (and the form boxes, which inherit
    // it) takes the near-white dark-mode colour from globals.css.
    <main className="min-h-screen bg-cream px-4 py-8 text-ink sm:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>

            <p className="text-sm font-medium text-navy-soft">
              Module Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-ink">
              Modules
            </h1>

            {/* Heading depends on the role (helpers in lib/roles.ts) */}
            {isProgrammeAdminRole(profile?.role) && (
              <p className="mt-2 text-ink-soft">
                Managing modules for {programmeName}
              </p>
            )}

            {isSuperAdminRole(profile?.role) && (
              <p className="mt-2 text-ink-soft">
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

        {/* Add / Edit Form (any admin; programme admins locked to their programme) */}
        {canManage && (
        <div ref={formRef} className="mb-8 scroll-mt-6 rounded-xl border border-line bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-ink">
              {editingId !== null
                ? "Edit Module"
                : "Add Module"}
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              Enter the module information below.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* Programme: chosen when adding; locked when editing,
                and always locked for a programme admin (Part 22) */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-nav">
                Programme
              </label>

              <select
                value={formProgrammeId}
                onChange={(e) => setFormProgrammeId(e.target.value)}
                disabled={editingId !== null || !isSuperAdminRole(profile?.role)}
                className="w-full rounded-lg border border-sky-line bg-white px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint disabled:bg-cream disabled:text-ink-soft"
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
              <label className="mb-2 block text-sm font-medium text-ink-nav">
                Module Code
              </label>

              <input
                type="text"
                value={moduleCode}
                onChange={(e) =>
                  setModuleCode(e.target.value)
                }
                placeholder="e.g. CSF101"
                className="w-full rounded-lg border border-sky-line px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
              />
            </div>

            {/* Module Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-nav">
                Module Name
              </label>

              <input
                type="text"
                value={moduleName}
                onChange={(e) =>
                  setModuleName(e.target.value)
                }
                placeholder="e.g. Programming Fundamentals"
                className="w-full rounded-lg border border-sky-line px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
              />
            </div>

            {/* Year */}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-nav">
                Year
              </label>

              <select
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                className="w-full rounded-lg border border-sky-line bg-white px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
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
              <label className="mb-2 block text-sm font-medium text-ink-nav">
                Semester
              </label>

              <select
                value={semester}
                onChange={(e) =>
                  setSemester(e.target.value)
                }
                className="w-full rounded-lg border border-sky-line bg-white px-4 py-2.5 outline-none focus:border-navy-soft focus:ring-2 focus:ring-sky-tint"
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
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-lg border border-sky-line bg-white px-5 py-2.5 text-sm font-medium text-ink-nav hover:bg-cream disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        )}

        {/* Part 28: Programme (super admin only) / Year / Semester */}
        <FilterBar
          programmes={isSuperAdminRole(profile?.role) ? programmes.map((p) => p.name) : undefined}
          programme={listProgramme}
          onProgrammeChange={setListProgramme}
          year={listYear}
          onYearChange={setListYear}
          semester={listSemester}
          onSemesterChange={setListSemester}
          onClear={clearListFilters}
        />

        {/* Module List (Part 21: crisp box, modules grouped by year and
            semester, code in a small tag, only inactive modules marked) */}
        <div className="overflow-hidden rounded-md border-[1.5px] border-card-line bg-white">
          <div className="border-b border-line px-6 py-5">
            <h2 className="text-lg font-semibold text-ink">
              Module List
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              {visibleModules.length} module
              {visibleModules.length !== 1
                ? "s"
                : ""}
            </p>

          </div>

          {visibleModules.length === 0 ? (
            <div className="px-6 py-12 text-center">
              {modules.length === 0 ? (
                <p className="text-ink-soft">
                  No modules have been added yet.
                </p>
              ) : (
                <>
                  <p className="text-ink-soft">No modules match these filters.</p>
                  <button
                    type="button"
                    onClick={clearListFilters}
                    className="mt-2 rounded text-sm font-semibold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {moduleGroups(visibleModules).map((group) => (
                <section key={group.key} aria-label={group.title}>
                  <h3 className="border-t border-sky-line bg-sky-wash px-6 py-2.5 font-display font-bold text-navy">
                    {group.title}{" "}
                    <span className="font-sans text-sm font-semibold text-ink-soft">
                      {group.modules.length} {group.modules.length === 1 ? "module" : "modules"}
                    </span>
                  </h3>
                  <ul>
                    {group.modules.map((module) => (
                      <li
                        key={module.id}
                        className="flex flex-col gap-3 border-t border-line px-6 py-3.5 md:flex-row md:items-center md:gap-4"
                      >
                        <div className={`flex min-w-0 flex-1 items-center gap-4 ${module.active ? "" : "opacity-60"}`}>
                          {/* Module code in a small tag, like the card tabs */}
                          <span className="w-24 shrink-0 rounded bg-sky-tint py-1 text-center font-display text-[13px] font-extrabold tracking-wide text-navy-soft">
                            {module.module_code}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-2 font-bold text-ink">
                              {module.module_name}
                              {!module.active && (
                                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden="true">
                                    <circle cx="12" cy="12" r="8.5" />
                                  </svg>
                                  Inactive
                                </span>
                              )}
                            </p>
                            {/* The super admin sees modules of every programme */}
                            {canManage && (
                              <p className="text-sm text-ink-soft">{programmeNameById(module.programme_id)}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions (super admin only) */}
                        {canManage && (
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleEdit(module)}
                              className="h-10 rounded-md border-[1.5px] border-navy bg-white px-4 text-sm font-bold text-navy transition hover:bg-sky-wash"
                            >
                              Edit
                            </button>
                            {module.active ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(module)}
                                className="text-sm font-bold text-red-700 underline underline-offset-[3px]"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivate(module)}
                                className="text-sm font-bold text-green-700 underline underline-offset-[3px]"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}