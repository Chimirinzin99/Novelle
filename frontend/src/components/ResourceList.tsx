"use client";

// Shared resource list for Notes, Question Papers and Assignments.
// Handles fetching, filters, PDF viewing/downloading and favourites.
// Part 13d: cards show the author credit and Solved/Unsolved; question
// papers and assignments get an extra All / Solved / Unsolved filter.
// PDF preview part: View opens the preview window instead of a new tab.
// Part 12: drawn with the shared PageHeader, FilterBar, PdfCard and
// EmptyState (theme colours); the data code is unchanged.
// Part 23: 24 cards at a time with a "Load more" button (lib/useLoadMore.ts).

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { downloadFile } from "@/lib/files";
import { fetchLikeCounts, setLiked } from "@/lib/likes";
import FilterBar from "@/components/FilterBar";
import PageHeader, { CountPill } from "@/components/PageHeader";
import CardSkeleton from "@/components/CardSkeleton";
import PdfCard from "@/components/PdfCard";
import EmptyState from "@/components/EmptyState";
import LoadMoreButton from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
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
  module_code: string | null; // Part 25: shown on the card
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
      .select("id, title, topic, year, semester, module_code, module_name, file_path, author_type, author_name, is_solved")
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
      module_code: item.module_code,
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

    // Part 19: all like counts in one request (was one request per card)
    const counts = await fetchLikeCounts(loaded.map((resource) => resource.id));

    setLikeCounts(counts);
    setLoading(false);
  }

  // PDF preview part: View opens the preview window (usePreview), Download
  // saves the file (lib/files.ts). Both used to open a new tab.
  const { openPdf } = usePreview();

  async function openFile(filePath: string | null, download: boolean, title: string) {
    if (!filePath) {
      setError(`This ${singular} does not have a file.`);
      return;
    }

    if (!download) {
      openPdf(filePath, title);
      return;
    }

    if (!(await downloadFile(filePath))) {
      setError(`Unable to download this ${singular}.`);
    }
  }

  // Like / unlike. The star (Part 21; was a heart) and count change straight away ("optimistic"),
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

  // Year / semester checks on their own, so the module dropdown can use them.
  const yearMatches = (resource: Resource) =>
    selectedYear === "All Years" ||
    resource.year?.toString() === selectedYear.replace("Year ", "");

  const semesterMatches = (resource: Resource) =>
    selectedSemester === "All Semesters" ||
    resource.semester?.toString() === selectedSemester.replace("Semester ", "");

  // Part 22: the module dropdown only lists modules of the chosen year and
  // semester (A–Z), so it never offers a module that would show nothing.
  const modules = [
    ...new Set(
      resources
        .filter((r) => yearMatches(r) && semesterMatches(r))
        .map((r) => r.module_name)
    ),
  ].sort((a, b) => a.localeCompare(b));

  // Changing year or semester resets the module (it may not exist there).
  function changeYear(value: string) {
    setSelectedYear(value);
    setSelectedModule("All Modules");
  }

  function changeSemester(value: string) {
    setSelectedSemester(value);
    setSelectedModule("All Modules");
  }

  // Matches every filter except Solved/Unsolved (the tabs show these counts).
  const matchesOtherFilters = (resource: Resource) => {
    const yearMatch = yearMatches(resource);
    const semesterMatch = semesterMatches(resource);

    const moduleMatch =
      selectedModule === "All Modules" ||
      resource.module_name === selectedModule;

    return yearMatch && semesterMatch && moduleMatch;
  };

  const beforeSolved = resources.filter(matchesOtherFilters);
  const solvedCounts: Record<SolvedFilter, number> = {
    all: beforeSolved.length,
    solved: beforeSolved.filter((r) => r.is_solved).length,
    unsolved: beforeSolved.filter((r) => !r.is_solved).length,
  };

  const filtered = beforeSolved.filter(
    (resource) =>
      solvedFilter === "all" || (solvedFilter === "solved") === resource.is_solved
  );

  // Part 23: draw 24 at a time; changing any filter starts again at 24.
  const page = useLoadMore(
    filtered,
    `${selectedYear}|${selectedSemester}|${selectedModule}|${solvedFilter}`
  );

  // Part 22: one card, used by both the flat list and the grouped view.
  const renderCard = (resource: Resource) => (
    <PdfCard
      key={resource.id}
      title={resource.name}
      type={type}
      moduleCode={resource.module_code}
      moduleName={resource.module_name}
      year={resource.year}
      semester={resource.semester}
      authorType={resource.author_type}
      authorName={resource.author_name}
      isSolved={resource.is_solved}
      onView={() => openFile(resource.file_path, false, resource.name)}
      onDownload={() => openFile(resource.file_path, true, resource.name)}
      liked={favourites.includes(resource.id)}
      likes={likeCounts[resource.id] || 0}
      onLike={() => handleFavourite(resource.id)}
    />
  );

  // Group only when a year AND a semester are chosen and no single module;
  // "All" stays one flat list. Modules in A–Z order.
  const groupByModule =
    selectedYear !== "All Years" &&
    selectedSemester !== "All Semesters" &&
    selectedModule === "All Modules";

  // Part 23: groups hold only the cards shown so far (page.shown); the
  // heading count is the module's full total, so it stays truthful.
  const moduleGroups: [string, Resource[], number][] = groupByModule
    ? [...new Set(page.shown.map((r) => r.module_name))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => [
          name,
          page.shown.filter((r) => r.module_name === name),
          filtered.filter((r) => r.module_name === name).length,
        ])
    : [];

  // Part 21: an empty list says what to do next. With no filters set, the
  // programme simply has nothing yet, so it invites an upload; with filters,
  // it offers to clear them.
  const filtersSet =
    selectedYear !== "All Years" ||
    selectedSemester !== "All Semesters" ||
    selectedModule !== "All Modules" ||
    solvedFilter !== "all";

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
          onYearChange={changeYear}
          semester={selectedSemester}
          onSemesterChange={changeSemester}
          modules={modules}
          module={selectedModule}
          onModuleChange={setSelectedModule}
          onClear={clearFilters}
        />

        {/* Part 13d: All / Solved / Unsolved (question papers, assignments).
            Part 21: underlined tabs with counts instead of round pills. */}
        {showSolvedFilter && (
          <div
            role="group"
            aria-label="Answers"
            className="-mt-2 mb-6 flex flex-wrap gap-x-6 border-b-[1.5px] border-sky-line"
          >
            {SOLVED_FILTERS.map((option) => {
              const active = solvedFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSolvedFilter(option.value)}
                  className={`-mb-[1.5px] border-b-[3px] px-0.5 py-2.5 text-[15px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    active ? "border-gold text-navy" : "border-transparent text-ink-soft hover:text-navy"
                  }`}
                >
                  {option.label}{" "}
                  <span className="font-semibold text-ink-soft">{solvedCounts[option.value]}</span>
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

        {/* Part 20: placeholder cards instead of a one-line message, so the
            page doesn't jump when the list arrives */}
        {loading ? (
          <CardSkeleton count={6} label={`Loading ${plural}…`} />
        ) : filtered.length === 0 ? (
          filtersSet ? (
            <EmptyState
              title={`No ${plural} match these filters`}
              text={
                selectedModule !== "All Modules"
                  ? `Nothing for ${selectedModule} yet. Have one? Upload it and help the next batch.`
                  : "Try other filters, or upload one yourself."
              }
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              title={`No ${plural} yet`}
              text={`Have ${singular === "assignment" ? "an" : "a"} ${singular} from an earlier semester? Upload it and an admin will check it before it goes live.`}
              actionLabel="Upload"
              actionHref="/submit-note"
            />
          )
        ) : groupByModule ? (
          // Part 22 (supervisor's "folder per module" idea): with a year AND a
          // semester chosen, the cards sit under one heading per module.
          <div className="flex flex-col gap-10">
            {moduleGroups.map(([moduleName, items, total]) => (
              <section key={moduleName} aria-label={moduleName}>
                <h2 className="mb-4 flex items-baseline gap-3 border-b border-line pb-2 text-xl font-bold text-navy">
                  {moduleName}
                  <span className="text-sm font-medium text-ink-soft">
                    {total} {total === 1 ? singular : plural}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          // 1 / 2 / 3 / 4 columns, same as /home
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {page.shown.map(renderCard)}
          </div>
        )}

        {!loading && <LoadMoreButton remaining={page.remaining} onClick={page.loadMore} />}
      </div>
    </main>
  );
}