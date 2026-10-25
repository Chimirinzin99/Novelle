"use client";

// Shared resource list for Notes, Question Papers and Assignments.
// Handles fetching, filters, PDF viewing/downloading and favourites.
// Part 13d: cards show the author credit and Solved/Unsolved; question
// papers and assignments get an extra All / Solved / Unsolved filter.
// Part 12: drawn with the shared PageHeader, FilterBar, PdfCard and
// EmptyState (theme colours); the data code is unchanged.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { setLiked } from "@/lib/likes";
import FilterBar from "@/components/FilterBar";
import PageHeader, { CountPill } from "@/components/PageHeader";
import PdfCard from "@/components/PdfCard";
import EmptyState from "@/components/EmptyState";
import { findProgrammeBySlug } from "@/lib/programmes";
import type { ResourceTypeCode } from "@/lib/resourceTypes";
import { isSolvableType } from "@/lib/author";

// Part 13d: the Solved filter's three choices
type SolvedFilter = "all" | "solved" | "unsolved";
const SOLVED_FILTERS: { value: SolvedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "solved", label: "Solved" },
  { value: "unsolved", label: "Unsolved" },
];

type ResourceListProps = {
  type: Exclude<ResourceTypeCode, "video">;
  heading: string;
  description: string;
  singular: string;
  plural: string;
};

type Resource = {
  id: number;
  name: string;
  year: number;
  semester: number;
  module_name: string;
  file_path: string | null;
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
};

export default function ResourceList({
  type,
  heading,
  description,
  singular,
  plural,
}: ResourceListProps) {
  const params = useParams();
  const programmeSlug = decodeURIComponent(params.programme as string);

  const [programme, setProgramme] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [selectedModule, setSelectedModule] = useState("All Modules");
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>("all"); // Part 13d
  const showSolvedFilter = isSolvableType(type);

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeSlug, type]);

  async function fetchResources() {
    setLoading(true);
    setError("");

    const programmeData = await findProgrammeBySlug(programmeSlug);

    if (!programmeData) {
      setError(`Unable to find programme "${programmeSlug}".`);
      setLoading(false);
      return;
    }

    setProgramme(programmeData.name);

    const { data, error: loadError } = await supabase
      .from("resources")
      .select("id, title, topic, year, semester, module_name, file_path, author_type, author_name, is_solved")
      .eq("programme_id", programmeData.id)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error(`Load ${plural} error:`, loadError);
      setError(`Unable to load ${plural}.`);
      setLoading(false);
      return;
    }

    const loaded: Resource[] = (data || []).map((item) => ({
      id: item.id,
      name: item.title || item.topic,
      year: item.year,
      semester: item.semester,
      module_name: item.module_name || "Unknown Module",
      file_path: item.file_path,
      author_type: item.author_type,
      author_name: item.author_name,
      is_solved: item.is_solved === true,
    }));

    setResources(loaded);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: favouriteData, error: favouriteError } = await supabase
        .from("favourites")
        .select("resource_id")
        .eq("user_id", user.id);

      if (favouriteError) {
        console.error("Favourite loading error:", favouriteError);
      } else {
        setFavourites((favouriteData || []).map((f) => f.resource_id));
      }
    } else {
      setFavourites([]);
    }

    const counts: Record<number, number> = {};

    await Promise.all(
      loaded.map(async (resource) => {
        const { data: likeCount, error: likeError } = await supabase.rpc(
          "get_like_count",
          { p_resource_id: resource.id }
        );

        counts[resource.id] = likeError ? 0 : Number(likeCount) || 0;
      })
    );

    setLikeCounts(counts);
    setLoading(false);
  }

  async function openFile(filePath: string | null, download: boolean) {
    if (!filePath) {
      setError(`This ${singular} does not have a file.`);
      return;
    }

    const { data, error: urlError } = await supabase.storage
      .from("resources")
      .createSignedUrl(
        filePath,
        3600,
        download ? { download: true } : {}
      );

    if (urlError || !data?.signedUrl) {
      console.error("Signed URL error:", urlError);
      setError(
        `Unable to ${download ? "download" : "open"} this ${singular}.`
      );
      return;
    }

    if (download) {
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  // Like / unlike. The heart and count change straight away ("optimistic"),
  // then lib/likes.ts saves it; if saving fails, both are put back.
  async function handleFavourite(resourceId: number) {
    const like = !favourites.includes(resourceId);
    const step = like ? 1 : -1;

    const apply = (direction: number) => {
      setFavourites((current) =>
        direction * step > 0 ? [...current, resourceId] : current.filter((id) => id !== resourceId)
      );
      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max((current[resourceId] || 0) + direction * step, 0),
      }));
    };

    apply(1); // show it now
    const problem = await setLiked(resourceId, like);
    if (problem) {
      apply(-1); // undo
      setError(problem);
    }
  }

  const modules = [...new Set(resources.map((r) => r.module_name))];

  const filtered = resources.filter((resource) => {
    const yearMatch =
      selectedYear === "All Years" ||
      resource.year?.toString() === selectedYear.replace("Year ", "");

    const semesterMatch =
      selectedSemester === "All Semesters" ||
      resource.semester?.toString() ===
        selectedSemester.replace("Semester ", "");

    const moduleMatch =
      selectedModule === "All Modules" ||
      resource.module_name === selectedModule;

    const solvedMatch =
      solvedFilter === "all" ||
      (solvedFilter === "solved") === resource.is_solved;

    return yearMatch && semesterMatch && moduleMatch && solvedMatch;
  });

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
    setSolvedFilter("all");
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          backHref={`/programmes/${encodeURIComponent(programmeSlug)}`}
          backLabel="Back to programme"
          eyebrow={programme || "Loading programme…"}
          title={heading}
          description={description}
          aside={
            !loading && (
              <CountPill>
                {filtered.length} {filtered.length === 1 ? singular : plural}
              </CountPill>
            )
          }
        />

        <FilterBar
          year={selectedYear}
          onYearChange={setSelectedYear}
          semester={selectedSemester}
          onSemesterChange={setSelectedSemester}
          modules={modules}
          module={selectedModule}
          onModuleChange={setSelectedModule}
          onClear={clearFilters}
        />

        {/* Part 13d: All / Solved / Unsolved (question papers, assignments) */}
        {showSolvedFilter && (
          <div role="group" aria-label="Solved filter" className="-mt-2 mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-ink-nav">Answers:</span>
            {SOLVED_FILTERS.map((option) => {
              const active = solvedFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSolvedFilter(option.value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    active ? "bg-navy text-white" : "border border-sky-line bg-white text-navy hover:bg-sky-wash"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <EmptyState title={`Loading ${plural}…`} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No ${plural} found`}
            text={`There are no matching ${plural} for these filters yet. Try changing your selections or check back later.`}
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          // 1 / 2 / 3 / 4 columns, same as /home
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((resource) => (
              <PdfCard
                key={resource.id}
                title={resource.name}
                type={type}
                moduleName={resource.module_name}
                year={resource.year}
                semester={resource.semester}
                authorType={resource.author_type}
                authorName={resource.author_name}
                isSolved={resource.is_solved}
                onView={() => openFile(resource.file_path, false)}
                onDownload={() => openFile(resource.file_path, true)}
                liked={favourites.includes(resource.id)}
                likes={likeCounts[resource.id] || 0}
                onLike={() => handleFavourite(resource.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}