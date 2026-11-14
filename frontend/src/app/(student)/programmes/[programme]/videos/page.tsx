"use client";

// Programme videos page (/programmes/<slug>/videos).
// Part 12: drawn with the shared PageHeader, FilterBar, VideoCard and
// EmptyState (theme colours); the data code is unchanged.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLikeCounts, setLiked } from "@/lib/likes";
import FilterBar from "@/components/FilterBar";
import PageHeader, { CountPill } from "@/components/PageHeader";
import LoadMoreButton from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import VideoCard from "@/components/VideoCard";
import EmptyState from "@/components/EmptyState";
import { findProgrammeBySlug } from "@/lib/programmes";

// One video row from the resources table (type = 'video').
type Video = {
  id: number;
  topic: string;
  year: number;
  semester: number;
  module_name: string;
  video_id: string; // 11-character YouTube ID
};

export default function VideosPage() {
  const params = useParams();

  const programmeSlug = decodeURIComponent(
    params.programme as string
  );

  // The programme's real name, shown in the header once it has loaded.
  const [programme, setProgramme] = useState("");

  const [videos, setVideos] = useState<Video[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [selectedModule, setSelectedModule] = useState("All Modules");

  useEffect(() => {
    fetchVideos();
  }, [programmeSlug]);

  async function fetchVideos() {
    setLoading(true);
    setError("");

    // 1. Find the programme whose slugified name matches the URL slug.
    const programmeData = await findProgrammeBySlug(programmeSlug);

    if (!programmeData) {
      setError(`Unable to find programme "${programmeSlug}".`);
      setLoading(false);
      return;
    }

    setProgramme(programmeData.name);

    // 2. This programme's videos, newest first.
    const { data, error: videosError } = await supabase
      .from("resources")
      .select("id, topic, year, semester, module_name, video_id")
      .eq("programme_id", programmeData.id)
      .eq("type", "video")
      .order("created_at", { ascending: false });

    if (videosError) {
      console.error("Videos error:", videosError);
      setError("Unable to load videos.");
      setLoading(false);
      return;
    }

    const loadedVideos: Video[] = (data || []).map((item) => ({
      id: item.id,
      topic: item.topic,
      year: item.year,
      semester: item.semester,
      module_name: item.module_name || "Unknown Module",
      video_id: item.video_id,
    }));

    setVideos(loadedVideos);

    // 3. Which of these the logged-in student has liked.
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
    }

    // 4. Total likes per video — Part 19: all in one request (lib/likes.ts)
    const counts = await fetchLikeCounts(loadedVideos.map((video) => video.id));

    setLikeCounts(counts);
    setLoading(false);
  }

  // Like / unlike (same as the Notes page).
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
  const yearMatches = (video: Video) =>
    selectedYear === "All Years" ||
    video.year.toString() === selectedYear.replace("Year ", "");

  const semesterMatches = (video: Video) =>
    selectedSemester === "All Semesters" ||
    video.semester.toString() === selectedSemester.replace("Semester ", "");

  // Part 22: module dropdown options — only modules of the chosen year and
  // semester, A–Z (same as Notes / Question Papers / Assignments).
  const modules = [
    ...new Set(
      videos
        .filter((video) => yearMatches(video) && semesterMatches(video))
        .map((video) => video.module_name)
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

  const filteredVideos = videos.filter(
    (video) =>
      yearMatches(video) &&
      semesterMatches(video) &&
      (selectedModule === "All Modules" || video.module_name === selectedModule)
  );

  // Part 23: draw 24 at a time; changing any filter starts again at 24.
  const page = useLoadMore(
    filteredVideos,
    `${selectedYear}|${selectedSemester}|${selectedModule}`
  );

  // Part 22: with a year AND a semester chosen (and no single module), the
  // videos are grouped under one heading per module, A–Z.
  const groupByModule =
    selectedYear !== "All Years" &&
    selectedSemester !== "All Semesters" &&
    selectedModule === "All Modules";

  // Part 23: groups hold the videos shown so far; the count is the full total.
  const moduleGroups: [string, Video[], number][] = groupByModule
    ? [...new Set(page.shown.map((v) => v.module_name))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => [
          name,
          page.shown.filter((v) => v.module_name === name),
          filteredVideos.filter((v) => v.module_name === name).length,
        ])
    : [];

  // One card, used by both the flat list and the grouped view.
  const renderCard = (video: Video) => (
    <VideoCard
      key={video.id}
      title={video.topic}
      videoId={video.video_id}
      moduleName={video.module_name}
      year={video.year}
      semester={video.semester}
      liked={favourites.includes(video.id)}
      likes={likeCounts[video.id] || 0}
      onLike={() => handleFavourite(video.id)}
    />
  );

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          backHref={`/programmes/${encodeURIComponent(programmeSlug)}`}
          backLabel="Back to programme"
          eyebrow={programme || "Loading programme…"}
          title="Videos"
          description="Video lessons added by your programme admins. They open on YouTube."
          aside={
            !loading && (
              <CountPill>
                {filteredVideos.length} {filteredVideos.length === 1 ? "video" : "videos"}
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

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <EmptyState title="Loading videos…" />
        ) : filteredVideos.length === 0 ? (
          <EmptyState
            title="No videos found"
            text="Try changing your filters or check back later."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : groupByModule ? (
          <div className="flex flex-col gap-10">
            {moduleGroups.map(([moduleName, items, total]) => (
              <section key={moduleName} aria-label={moduleName}>
                <h2 className="mb-4 flex items-baseline gap-3 border-b border-line pb-2 text-xl font-bold text-navy">
                  {moduleName}
                  <span className="text-sm font-medium text-ink-soft">
                    {total} {total === 1 ? "video" : "videos"}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {page.shown.map(renderCard)}
          </div>
        )}

        {!loading && <LoadMoreButton remaining={page.remaining} onClick={page.loadMore} />}
      </div>
    </main>
  );
}