"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";
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

  // "software-engineering" -> "Software Engineering"
  const programme = programmeSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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
  }, [programme]);

  async function fetchVideos() {
    setLoading(true);
    setError("");

    // 1. Find the programme by name.
    const { data: programmeData, error: programmeError } = await supabase
      .from("programmes")
      .select("id, name")
      .eq("name", programme)
      .single();

    if (programmeError || !programmeData) {
      console.error("Programme error:", programmeError);
      setError(`Unable to find programme "${programme}".`);
      setLoading(false);
      return;
    }

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
    <main className="min-h-full bg-gray-200 text-gray-900">
      <section className="min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-12">

        {/* Back */}
        <Link
          href={`/programmes/${encodeURIComponent(programmeSlug)}`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-sm font-medium text-blue-600">{programme}</p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
                Videos
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Video lessons added by your programme admins. They open on
                YouTube.
              </p>
            </div>

            {!loading && (
              <div className="text-sm font-medium text-gray-500">
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
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No videos found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Try changing your filters or check back later.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredVideos.map((video) => {
              const isFavourite = favourites.includes(video.id);
              const likes = likeCounts[video.id] || 0;

              return (
                <div
                  key={video.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Thumbnail: a normal link, so it opens YouTube in a new tab */}
                  <a
                    href={youTubeWatchUrl(video.video_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={youTubeThumbnail(video.video_id)}
                      alt={video.topic}
                      loading="lazy"
                      className="aspect-video w-full bg-gray-100 object-cover"
                    />

                    {/* Play button drawn on top of the thumbnail */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="ml-0.5 h-6 w-6"
                        >
                          <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                        </svg>
                      </span>
                    </span>
                  </a>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {video.topic}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {video.module_name}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      Year {video.year} · Semester {video.semester}
                    </p>

                    <div className="mt-auto flex items-center gap-2 border-t pt-3">
                      <a
                        href={youTubeWatchUrl(video.video_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Watch on YouTube
                      </a>

                      {/* Like */}
                      <button
                        onClick={() => handleFavourite(video.id)}
                        title={isFavourite ? "Unlike" : "Like"}
                        className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                          isFavourite
                            ? "border-red-200 bg-red-50 text-red-500"
                            : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500"
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