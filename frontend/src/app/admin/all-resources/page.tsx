"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { resourceTypeLabel } from "@/lib/resourceTypes";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";

type Resource = {
  id: number;
  title: string | null;
  topic: string | null;
  type: string;
  module_name: string | null;
  year: number;
  semester: number;
  programme_id: number;
  file_path: string | null;
  video_id: string | null;
  created_at: string;
  programmes: { name: string } | null;
};

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
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [success, setSuccess] = useState("");

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

      let resourceQuery = supabase
        .from("resources")
        .select("id, title, topic, type, module_name, year, semester, programme_id, file_path, video_id, created_at, programmes(name)")
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
        const [{ data: favouriteRows }, countRows] = await Promise.all([
          supabase.from("favourites").select("resource_id").eq("user_id", user.id),
          Promise.all(loaded.map(async (resource) => {
            const { data: count, error: countError } = await supabase.rpc(
              "get_like_count",
              { p_resource_id: resource.id }
            );
            return [resource.id, countError ? 0 : Number(count) || 0] as const;
          })),
        ]);
        setFavourites((favouriteRows || []).map((row) => row.resource_id));
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

  async function openFile(resource: Resource, download: boolean) {
    if (!resource.file_path) {
      setError("This resource does not have a file attached.");
      return;
    }
    setOpeningId(resource.id);
    const { data, error: signedUrlError } = await supabase.storage
      .from("resources")
      .createSignedUrl(resource.file_path, 3600, download ? { download: true } : {});
    setOpeningId(null);
    if (signedUrlError || !data?.signedUrl) {
      setError(`Unable to ${download ? "download" : "open"} this resource.`);
      return;
    }
    if (download) {
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function toggleFavourite(resourceId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in to like a resource.");
      return;
    }
    const isFavourite = favourites.includes(resourceId);
    if (isFavourite) {
      const { error: removeError } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);
      if (removeError) {
        setError("Unable to remove this resource from your liked resources.");
        return;
      }
      setFavourites((current) => current.filter((id) => id !== resourceId));
      setLikeCounts((current) => ({ ...current, [resourceId]: Math.max((current[resourceId] || 0) - 1, 0) }));
      return;
    }
    const { error: addError } = await supabase
      .from("favourites")
      .insert({ user_id: user.id, resource_id: resourceId });
    if (addError) {
      setError("Unable to like this resource.");
      return;
    }
    setFavourites((current) => [...current, resourceId]);
    setLikeCounts((current) => ({ ...current, [resourceId]: (current[resourceId] || 0) + 1 }));
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
      const response = await fetch(`${BACKEND_URL}/api/resources/${resource.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Unable to delete this resource.");
        return;
      }
      setResources((current) => current.filter((item) => item.id !== resource.id));
      setFavourites((current) => current.filter((id) => id !== resource.id));
      setLikeCounts((current) => {
        const next = { ...current };
        delete next[resource.id];
        return next;
      });
      setSuccess("Resource deleted.");
    } catch (deleteError) {
      console.error("Delete resource error:", deleteError);
      setError("Unable to connect while deleting the resource.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-full bg-slate-50 px-5 py-7 text-[#24344D] md:px-10 md:py-9 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.push("/admin")} className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#E7E5DF] bg-white px-4 py-2.5 text-sm font-medium text-[#294C78] shadow-sm transition hover:bg-[#E7EEF8]">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#456FAD]">Resource library</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">All resources</h1>
            <p className="mt-2 text-sm text-slate-500">Browse notes, papers, assignments, and videos in your admin scope.</p>
          </div>
          {!loading && <span className="w-fit rounded-full border border-[#E7E5DF] bg-white px-3 py-1.5 text-sm font-medium text-[#294C78]">{visibleResources.length} {visibleResources.length === 1 ? "resource" : "resources"}</span>}
        </header>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter resources by type">
            {filters.map((item) => (
              <button key={item.value} role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${filter === item.value ? "bg-[#294C78] text-white" : "border border-[#E7E5DF] bg-white text-slate-600 hover:bg-[#F1F4F8]"}`}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, module, programme…" className="w-full rounded-xl border border-[#E7E5DF] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#456FAD] focus:ring-2 focus:ring-[#456FAD]/20" />
          </label>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        {loading ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-10 text-center text-sm text-slate-500">Loading resources…</div>
        ) : visibleResources.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white px-6 py-14 text-center shadow-sm">
            <BookOpen className="mx-auto h-8 w-8 text-[#456FAD]" />
            <h2 className="mt-4 text-lg font-semibold">No resources found</h2>
            <p className="mt-2 text-sm text-slate-500">Try another search or resource type.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleResources.map((resource) => {
              const isVideo = resource.type === "video";
              const videoId = resource.video_id || "";
              const title = resource.title || resource.topic || "Untitled resource";
              const isFavourite = favourites.includes(resource.id);
              const likes = likeCounts[resource.id] || 0;
              return (
                <article key={resource.id} className="flex min-h-[215px] flex-col overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D5E7] hover:shadow-md">
                  {isVideo && videoId ? (
                    <a href={youTubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="relative block aspect-video bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={youTubeThumbnail(videoId)} alt={`${title} thumbnail`} className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white"><span className="rounded-full bg-black/65 px-4 py-2 text-sm font-semibold">Play video</span></span>
                    </a>
                  ) : null}
                  <div className={`flex flex-1 flex-col ${isVideo && videoId ? "p-4" : "p-5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#24344D]">{title}</h2>
                      <span className="shrink-0 rounded-full bg-[#E7EEF8] px-2 py-1 text-[10px] font-medium text-[#294C78]">{resourceTypeLabel(resource.type)}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-slate-500">{resource.module_name || "Unknown module"}{resource.programmes?.name ? ` · ${resource.programmes.name}` : ""}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Year {resource.year}</span><span>Semester {resource.semester}</span></div>
                    <div className="mt-auto flex items-center gap-2 border-t border-[#E7E5DF] pt-3">
                      {isVideo && videoId ? (
                        <a href={youTubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md bg-[#294C78] px-2 py-2.5 text-center text-xs font-medium text-white hover:bg-[#203B60]">Watch</a>
                      ) : (
                        <>
                          <button onClick={() => openFile(resource, false)} disabled={!resource.file_path || openingId === resource.id} className="flex-1 rounded-md bg-[#294C78] px-2 py-2.5 text-xs font-medium text-white hover:bg-[#203B60] disabled:opacity-50">{openingId === resource.id ? "Opening…" : "View"}</button>
                      <button onClick={() => openFile(resource, true)} disabled={!resource.file_path || openingId === resource.id} className="flex-1 rounded-md border border-[#D9DEE7] px-2 py-2.5 text-xs font-medium text-[#294C78] hover:bg-[#F0F4FA] disabled:opacity-50">Download</button>
                        </>
                      )}
                      <button onClick={() => toggleFavourite(resource.id)} title={isFavourite ? "Unlike" : "Like"} aria-label={`${isFavourite ? "Unlike" : "Like"} ${title}; ${likes} likes`} aria-pressed={isFavourite} className={`flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-md border transition ${isFavourite ? "border-red-200 bg-red-50 text-red-500" : "border-[#D9DEE7] text-slate-500 hover:bg-red-50 hover:text-red-500"}`}>
                        <Heart className="h-4 w-4" fill={isFavourite ? "currentColor" : "none"} />
                        <span className="text-xs leading-none">{likes}</span>
                      </button>
                      <button onClick={() => deleteResource(resource)} disabled={deletingId === resource.id} title="Delete resource" aria-label={`Delete ${title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E7E5DF] text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
