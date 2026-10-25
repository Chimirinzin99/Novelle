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
import { Heart, Pencil, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
        const countRows = await Promise.all(
          loaded.map(async (resource) => {
            const { data: count, error: countError } = await supabase.rpc(
              "get_like_count",
              { p_resource_id: resource.id }
            );
            return [resource.id, countError ? 0 : Number(count) || 0] as const;
          })
        );
        setLikeCounts(Object.fromEntries(countRows));
      }
      setLoading(false);
    }
    void loadResources();
  }, [router]);

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesType = filter === "all" || resource.type === filter;
      const programme = resource.programmes?.name || "";
      const searchable = [resource.title, resource.topic, resource.module_name, programme]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, query, resources]);

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
    const title = resource.title || resource.topic || "this resource";
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;

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
      setSuccess("Resource deleted.");
    } catch (deleteError) {
      console.error("Delete resource error:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to connect while deleting the resource."
      );
    } finally {
      setDeletingId(null);
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
    "flex h-10 w-10 items-center justify-center rounded-[10px] border-[1.5px] border-sky-line bg-white text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 disabled:cursor-wait disabled:opacity-50";

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          backHref="/admin"
          backLabel="Back to Dashboard"
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

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>}

        {loading ? (
          <EmptyState title="Loading resources…" />
        ) : visibleResources.length === 0 ? (
          <EmptyState title="No resources found" text="Try another search or resource type." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleResources.map((resource) => {
              const title = resource.title || resource.topic || "Untitled resource";
              const likes = likeCounts[resource.id] || 0;

              // Programme link (useful for the super admin, who sees all).
              const programmeLink = resource.programmes?.name && (
                <p className="text-sm font-semibold text-navy-soft">{resource.programmes.name}</p>
              );

              // Bottom row: read-only like count on the left, Edit + Delete on the right.
              const footer = (
                <>
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft"
                    title="Likes from students"
                  >
                    <Heart className="h-4 w-4 text-gold" aria-hidden="true" />
                    {likes} {likes === 1 ? "like" : "likes"}
                  </span>
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
                      onClick={() => deleteResource(resource)}
                      disabled={deletingId === resource.id}
                      title="Delete resource"
                      aria-label={`Delete ${title}`}
                      className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </>
              );

              return resource.type === "video" && resource.video_id ? (
                <VideoCard
                  key={resource.id}
                  title={title}
                  videoId={resource.video_id}
                  moduleName={resource.module_name}
                  year={resource.year}
                  semester={resource.semester}
                  extra={programmeLink}
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
                  extra={programmeLink}
                  onView={() => openFile(resource, false)}
                  onDownload={() => openFile(resource, true)}
                  footer={footer}
                />
              );
            })}
          </div>
        )}
      </div>

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