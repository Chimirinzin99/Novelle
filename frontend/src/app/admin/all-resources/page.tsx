"use client";

// /admin/all-resources — every published resource in the admin's scope
// (own programme, or all for the super admin), with type tabs and search.
// Part 12:
//   - cards are the shared PdfCard / VideoCard (theme colours, type badges)
//   - likes are shown as a read-only count: admins manage resources, they
//     don't like them (user's decision, 24 Oct). Admins can still like
//     things when browsing the student pages.
//   - the Edit (pencil) button is back, opening <EditResourceDialog />
//     (it had no button since the 21 Oct redesign)
// Part 13d: PDF cards show the author credit and Solved/Unsolved; the Edit
//   window can change both.
// PDF preview part: View opens the preview window (Download still saves);
//   videos play in the window through VideoCard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Star, Pencil, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchLikeCounts } from "@/lib/likes";
import { usePreview } from "@/components/PreviewProvider";
import { downloadFile } from "@/lib/files";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import PageHeader, { CountPill } from "@/components/PageHeader";
import PdfCard from "@/components/PdfCard";
import VideoCard from "@/components/VideoCard";
import EmptyState from "@/components/EmptyState";
import EditResourceDialog from "@/components/EditResourceDialog";
import FilterBar from "@/components/FilterBar";

type Resource = {
  id: number;
  title: string | null;
  topic: string | null;
  type: string;
  module_id: number | null;
  module_name: string | null;
  year: number;
  semester: number;
  programme_id: number;
  file_path: string | null;
  video_id: string | null;
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
  created_at: string;
  programmes: { name: string } | null;
};

// The columns this page reads (also used to reload one resource after an edit).
const RESOURCE_COLUMNS =
  "id, title, topic, type, module_id, module_name, year, semester, programme_id, file_path, video_id, author_type, author_name, is_solved, created_at, programmes(name)";

const filters = [
  { value: "all", label: "All resources" },
  { value: "note", label: "Notes" },
  { value: "question_paper", label: "Question papers" },
  { value: "assignment", label: "Assignments" },
  { value: "video", label: "Videos" },
];

export default function AllResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  // Part 22: the same Year / Semester / Module filter as the student pages,
  // plus Programme for the super admin.
  const [selectedProgramme, setSelectedProgramme] = useState("All Programmes");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [selectedModule, setSelectedModule] = useState("All Modules");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [success, setSuccess] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // The resource in the Edit window (null = closed).
  const [editing, setEditing] = useState<Resource | null>(null);

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get("type");
    if (requestedType && filters.some((item) => item.value === requestedType)) {
      setFilter(requestedType);
    }

    async function loadResources() {
      setLoading(true);
      setError("");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, programme_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile || !isAdminRole(profile.role)) {
        router.replace("/home");
        return;
      }
      setIsSuperAdmin(isSuperAdminRole(profile.role));

      let resourceQuery = supabase
        .from("resources")
        .select(RESOURCE_COLUMNS)
        .order("created_at", { ascending: false });
      if (!isSuperAdminRole(profile.role)) {
        resourceQuery = resourceQuery.eq("programme_id", profile.programme_id ?? -1);
      }
      const { data, error: resourcesError } = await resourceQuery;
      if (resourcesError) {
        console.error("Admin resources load error:", resourcesError);
        setError("Unable to load resources. Please try again.");
      } else {
        const loaded = (data || []) as unknown as Resource[];
        setResources(loaded);
        // Like counts only (admins don't like resources here).
        // Part 19: all in one request (was one request per resource).
        setLikeCounts(await fetchLikeCounts(loaded.map((resource) => resource.id)));
      }
      setLoading(false);
    }
    void loadResources();
  }, [router]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!pendingDelete || deletingId === pendingDelete.id) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDelete(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDelete, deletingId]);

  // Part 22: programme / year / semester checks on their own, so the module
  // dropdown can list only modules that would show something.
  const matchesPlace = useCallback(
    (resource: Resource) =>
      (selectedProgramme === "All Programmes" ||
        resource.programmes?.name === selectedProgramme) &&
      (selectedYear === "All Years" ||
        resource.year?.toString() === selectedYear.replace("Year ", "")) &&
      (selectedSemester === "All Semesters" ||
        resource.semester?.toString() === selectedSemester.replace("Semester ", "")),
    [selectedProgramme, selectedYear, selectedSemester]
  );

  const programmeOptions = useMemo(
    () =>
      [...new Set(resources.map((r) => r.programmes?.name).filter((n): n is string => !!n))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [resources]
  );

  const moduleOptions = useMemo(
    () =>
      [...new Set(resources.filter(matchesPlace).map((r) => r.module_name || "Unknown Module"))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [resources, matchesPlace]
  );

  // Changing programme, year or semester resets the module (it may not exist there).
  function changePlace(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setSelectedModule("All Modules");
    };
  }

  function clearFilters() {
    setSelectedProgramme("All Programmes");
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesType = filter === "all" || resource.type === filter;
      const matchesFilters =
        matchesPlace(resource) &&
        (selectedModule === "All Modules" ||
          (resource.module_name || "Unknown Module") === selectedModule);
      const programme = resource.programmes?.name || "";
      const searchable = [resource.title, resource.topic, resource.module_name, programme]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        matchesType && matchesFilters && (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [filter, query, resources, matchesPlace, selectedModule]);

  // Part 22: with a year AND a semester chosen (and no single module), the
  // cards are grouped under one heading per module. The super admin looking
  // at all programmes gets one group per programme + module, with the
  // programme named in the heading.
  const groupByModule =
    selectedYear !== "All Years" &&
    selectedSemester !== "All Semesters" &&
    selectedModule === "All Modules";

  const moduleGroups = useMemo(() => {
    if (!groupByModule) return [];
    const groups = new Map<string, { module: string; programme: string; items: Resource[] }>();
    for (const resource of visibleResources) {
      const moduleName = resource.module_name || "Unknown Module";
      const programme = resource.programmes?.name || "";
      const key = `${programme}|${moduleName}`;
      if (!groups.has(key)) groups.set(key, { module: moduleName, programme, items: [] });
      groups.get(key)!.items.push(resource);
    }
    return [...groups.values()].sort(
      (a, b) => a.programme.localeCompare(b.programme) || a.module.localeCompare(b.module)
    );
  }, [groupByModule, visibleResources]);

  const showProgrammeInHeading = isSuperAdmin && selectedProgramme === "All Programmes";

  const { openPdf } = usePreview();

  // View -> preview window; Download -> save the file (lib/files.ts).
  async function openFile(resource: Resource, download: boolean) {
    if (!resource.file_path) {
      setError("This resource does not have a file attached.");
      return;
    }
    if (!download) {
      openPdf(resource.file_path, resource.title || resource.topic || "Resource");
      return;
    }
    setOpeningId(resource.id);
    const ok = await downloadFile(resource.file_path);
    setOpeningId(null);
    if (!ok) setError("Unable to download this resource.");
  }

  async function deleteResource(resource: Resource) {
    setError("");
    setSuccess("");
    setDeletingId(resource.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your login session has expired. Please sign in again.");
        return;
      }
      const response = await callBackend(`${BACKEND_URL}/api/resources/${resource.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await readJson(response);
      if (!response.ok) {
        setError(result.message || "Unable to delete this resource.");
        return;
      }
      setResources((current) => current.filter((item) => item.id !== resource.id));
      setLikeCounts((current) => {
        const next = { ...current };
        delete next[resource.id];
        return next;
      });
      setSuccess("Resource deleted successfully.");
    } catch (deleteError) {
      console.error("Delete resource error:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to connect while deleting the resource."
      );
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  // After a successful edit: reload just that one resource, so its card
  // shows the new title/module/type, and close the window.
  // useCallback keeps the same function between renders (the Edit window
  // uses it inside a useEffect).
  const closeEdit = useCallback(() => setEditing(null), []);

  async function handleSaved() {
    if (!editing) return;
    const id = editing.id;
    setEditing(null);
    setError("");
    const { data, error: reloadError } = await supabase
      .from("resources")
      .select(RESOURCE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (reloadError || !data) {
      setError("Saved, but the list could not be refreshed. Reload the page.");
      return;
    }
    const updated = data as unknown as Resource;
    setResources((current) => current.map((item) => (item.id === id ? updated : item)));
    setSuccess("Changes saved.");
  }

  // Small square icon buttons for Edit / Delete.
  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] border-sky-line bg-white text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 disabled:cursor-wait disabled:opacity-50";

  // Part 22: one card, used by both the flat list and the grouped view.
  const renderCard = (resource: Resource) => {
    const title = resource.title || resource.topic || "Untitled resource";
    const likes = likeCounts[resource.id] || 0;

    // Programme link (useful for the super admin, who sees all).
    const programmeLink = resource.programmes?.name && (
      <p className="text-sm font-semibold text-navy-soft">{resource.programmes.name}</p>
    );
    const resourceMeta = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {programmeLink}
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft" title="Stars from students">
          <Star className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />
          {likes} {likes === 1 ? "star" : "stars"}
        </p>
      </div>
    );

    // Edit and Delete sit in the same action row as View/Download.
    const footer = (
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setSuccess("");
            setEditing(resource);
          }}
          title="Edit resource"
          aria-label={`Edit ${title}`}
          className={iconButton}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
            onClick={() => setPendingDelete(resource)}
          disabled={deletingId === resource.id}
          title="Delete resource"
          aria-label={`Delete ${title}`}
          className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    );

    return resource.type === "video" && resource.video_id ? (
      <VideoCard
        key={resource.id}
        title={title}
        videoId={resource.video_id}
        moduleName={resource.module_name}
        year={resource.year}
        semester={resource.semester}
        extra={resourceMeta}
        footer={footer}
      />
    ) : (
      <PdfCard
        key={resource.id}
        title={title}
        type={resource.type}
        moduleName={resource.module_name}
        year={resource.year}
        semester={resource.semester}
        authorType={resource.author_type}
        authorName={resource.author_name}
        isSolved={resource.is_solved}
        extra={resourceMeta}
        onView={() => openFile(resource, false)}
        onDownload={() => openFile(resource, true)}
        footer={footer}
      />
    );
  };

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Resource library"
          title="All resources"
          description={`Browse, edit and delete notes, papers, assignments and videos${isSuperAdmin ? " in every programme" : " in your programme"}.`}
          aside={
            !loading && (
              <CountPill>
                {visibleResources.length} {visibleResources.length === 1 ? "resource" : "resources"}
              </CountPill>
            )
          }
        />

        {/* Type tabs + search */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter resources by type">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-navy/40 ${
                  filter === item.value
                    ? "bg-navy text-white"
                    : "border-[1.5px] border-sky-line bg-white text-ink-nav hover:bg-sky-wash"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search resources</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, module, programme…"
              className="h-11 w-full rounded-[10px] border-[1.5px] border-sky-line bg-white pl-10 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
            />
          </label>
        </div>

        {/* Part 22: Programme (super admin only) / Year / Semester / Module */}
        <FilterBar
          programmes={isSuperAdmin ? programmeOptions : undefined}
          programme={selectedProgramme}
          onProgrammeChange={changePlace(setSelectedProgramme)}
          year={selectedYear}
          onYearChange={changePlace(setSelectedYear)}
          semester={selectedSemester}
          onSemesterChange={changePlace(setSelectedSemester)}
          modules={moduleOptions}
          module={selectedModule}
          onModuleChange={setSelectedModule}
          onClear={clearFilters}
        />

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-800 shadow-lg"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <EmptyState title="Loading resources…" />
        ) : visibleResources.length === 0 ? (
          <EmptyState title="No resources found" text="Try another search, type or filter." />
        ) : groupByModule ? (
          <div className="flex flex-col gap-10">
            {moduleGroups.map((group) => (
              <section key={`${group.programme}|${group.module}`} aria-label={group.module}>
                <h2 className="mb-4 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2 text-xl font-bold text-navy">
                  {group.module}
                  {showProgrammeInHeading && group.programme && (
                    <span className="text-sm font-semibold text-navy-soft">{group.programme}</span>
                  )}
                  <span className="text-sm font-medium text-ink-soft">
                    {group.items.length} {group.items.length === 1 ? "resource" : "resources"}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleResources.map(renderCard)}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 dark:bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && deletingId !== pendingDelete.id) {
              setPendingDelete(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-resource-title"
            aria-describedby="delete-resource-description"
            className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="delete-resource-title" className="text-xl font-bold text-navy">
              Delete this resource?
            </h2>
            <p id="delete-resource-description" className="mt-2 text-sm leading-6 text-ink-soft">
              Delete “{pendingDelete.title || pendingDelete.topic || "Untitled resource"}”? This action can’t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={deletingId === pendingDelete.id}
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-nav transition hover:bg-sky-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === pendingDelete.id}
                onClick={() => void deleteResource(pendingDelete)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingId === pendingDelete.id ? "Deleting…" : "Delete resource"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Edit window (opens over the page) */}
      {editing && (
        <EditResourceDialog
          resource={editing}
          isSuperAdmin={isSuperAdmin}
          onClose={closeEdit}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
