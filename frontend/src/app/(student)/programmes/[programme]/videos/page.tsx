"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";
import { findProgrammeBySlug } from "@/lib/programmes";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";

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

    // 4. Total likes per video (same database function as the Notes page).
    const counts: Record<number, number> = {};

    for (const video of loadedVideos) {
      const { data: likeCount, error: likeError } = await supabase.rpc(
        "get_like_count",
        { p_resource_id: video.id }
      );

      counts[video.id] = likeError ? 0 : Number(likeCount) || 0;
    }

    setLikeCounts(counts);
    setLoading(false);
  }

  // Like / unlike (same as the Notes page).
  async function handleFavourite(resourceId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to like a video.");
      return;
    }

    if (favourites.includes(resourceId)) {
      const { error: deleteError } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);

      if (deleteError) {
        console.error("Remove like error:", deleteError);
        setError("Unable to remove like.");
        return;
      }

      setFavourites((current) => current.filter((id) => id !== resourceId));
      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max((current[resourceId] || 0) - 1, 0),
      }));
      return;
    }

    const { error: insertError } = await supabase
      .from("favourites")
      .insert({ user_id: user.id, resource_id: resourceId });

    if (insertError) {
      console.error("Add like error:", insertError);
      setError("Unable to like this video.");
      return;
    }

    setFavourites((current) => [...current, resourceId]);
    setLikeCounts((current) => ({
      ...current,
      [resourceId]: (current[resourceId] || 0) + 1,
    }));
  }

  // Module dropdown options, taken from the loaded videos.
  const modules = [...new Set(videos.map((video) => video.module_name))];

  const filteredVideos = videos.filter((video) => {
    const yearMatch =
      selectedYear === "All Years" ||
      video.year.toString() === selectedYear.replace("Year ", "");

    const semesterMatch =
      selectedSemester === "All Semesters" ||
      video.semester.toString() === selectedSemester.replace("Semester ", "");

    const moduleMatch =
      selectedModule === "All Modules" || video.module_name === selectedModule;

    return yearMatch && semesterMatch && moduleMatch;
  });

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  return (
    <main className="min-h-full bg-[#FCFBF8] text-[#24344D]">
      <section className="min-w-0 flex-1 bg-[#FCFBF8] px-5 py-7 text-[#24344D] md:px-10 md:py-9 lg:px-12">
        {/* Back */}
        <Link
          href={`/programmes/${encodeURIComponent(programmeSlug)}`}
          className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[#E7E5DF] bg-white px-4 py-2.5 text-sm font-medium text-[#294C78] shadow-sm transition hover:border-[#C8D5E7] hover:bg-[#E7EEF8] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to programme
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#456FAD]">{programme}</p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#24344D] md:text-4xl">
                Videos
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Video lessons added by your programme admins. They open on
                YouTube.
              </p>
            </div>

            {!loading && (
              <div className="text-sm font-medium text-slate-500">
                {filteredVideos.length}{" "}
                {filteredVideos.length === 1 ? "video" : "videos"}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
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

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Loading / empty / list */}
        {loading ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#24344D]">
              No videos found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your filters or check back later.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded-lg bg-[#294C78] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203B60]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredVideos.map((video) => {
              const isFavourite = favourites.includes(video.id);
              const likes = likeCounts[video.id] || 0;

              return (
                <div
                  key={video.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D5E7] hover:shadow-md"
                >
                  {/* Thumbnail: opens YouTube in a new tab */}
                  <a
                    href={youTubeWatchUrl(video.video_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${video.topic} on YouTube`}
                    className="group relative block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={youTubeThumbnail(video.video_id)}
                      alt={video.topic}
                      loading="lazy"
                      className="aspect-video w-full bg-[#F0F2F5] object-cover"
                    />

                    {/* Play button on the thumbnail */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20 group-focus-visible:bg-black/20">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="ml-0.5 h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                        </svg>
                      </span>
                    </span>
                  </a>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#24344D]">
                        {video.topic}
                      </h3>

                      <span className="shrink-0 rounded-full bg-[#E7EEF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#294C78]">
                        Video
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 min-h-5 text-xs leading-5 text-slate-500">
                      {video.module_name}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Year {video.year}</span>
                      <span>Semester {video.semester}</span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 border-t border-[#F0EEE8] pt-4">
                      <a
                        href={youTubeWatchUrl(video.video_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg bg-[#294C78] px-2 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-[#203B60] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30 focus:ring-offset-2"
                      >
                        Watch on YouTube
                      </a>

                      {/* Like */}
                      <button
                        onClick={() => handleFavourite(video.id)}
                        title={isFavourite ? "Unlike" : "Like"}
                        aria-label={
                          isFavourite ? "Unlike video" : "Like video"
                        }
                        aria-pressed={isFavourite}
                        className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                          isFavourite
                            ? "border-red-200 bg-red-50 text-red-500"
                            : "border-[#D9DEE7] text-slate-500 hover:bg-red-50 hover:text-red-500"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill={isFavourite ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={isFavourite ? 0 : 2}
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>

                        <span className="text-xs leading-none">{likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}