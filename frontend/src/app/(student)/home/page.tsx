
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";
import WelcomeHeader from "@/components/WelcomeHeader";
import { programmeHref } from "@/lib/programmes";

type PdfResource = {
  id: number;
  title: string | null;
  topic: string;
  type: string;
  module_name: string | null;
  year: number;
  semester: number;
  file_path: string;
};

type Video = {
  id: number;
  title: string | null;
  topic: string;
  year: number;
  semester: number;
  video_id: string;
};

const HOME_VIDEO_LIMIT = 8;
const HOME_SECTION_LIMIT = 8;

export default function Home() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [notes, setNotes] = useState<PdfResource[]>([]);
  const [questionPapers, setQuestionPapers] = useState<PdfResource[]>([]);
  const [assignments, setAssignments] = useState<PdfResource[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, programme_id, programmes(name)")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }

      setFullName(profile.full_name);

      const programme = profile.programmes as unknown as {
        name: string;
      } | null;

      setProgrammeName(programme?.name ?? "");

      const { data: resources, error: resourcesError } = await supabase
        .from("resources")
        .select(
          "id, title, topic, type, module_name, year, semester, file_path"
        )
        .eq("programme_id", profile.programme_id)
        .in("type", ["note", "question_paper", "assignment"])
        .order("created_at", { ascending: false });

      if (resourcesError) {
        console.error("Error fetching resources:", resourcesError);
        setLoading(false);
        return;
      }

      const allPdfs: PdfResource[] = resources || [];

      const loadedNotes = allPdfs
        .filter((resource) => resource.type === "note")
        .slice(0, HOME_SECTION_LIMIT);

      const loadedPapers = allPdfs
        .filter((resource) => resource.type === "question_paper")
        .slice(0, HOME_SECTION_LIMIT);

      const loadedAssignments = allPdfs
        .filter((resource) => resource.type === "assignment")
        .slice(0, HOME_SECTION_LIMIT);

      setNotes(loadedNotes);
      setQuestionPapers(loadedPapers);
      setAssignments(loadedAssignments);

      const { data: videoData, error: videosError } = await supabase
        .from("resources")
        .select("id, title, topic, year, semester, video_id")
        .eq("programme_id", profile.programme_id)
        .eq("type", "video")
        .order("created_at", { ascending: false })
        .limit(HOME_VIDEO_LIMIT);

      if (videosError) {
        console.error("Error fetching videos:", videosError);
      }

      const loadedVideos: Video[] = videoData || [];
      setVideos(loadedVideos);

      const { data: favouriteData, error: favouriteError } = await supabase
        .from("favourites")
        .select("resource_id")
        .eq("user_id", user.id);

      if (favouriteError) {
        console.error("Error fetching favourites:", favouriteError);
      } else {
        setFavourites(
          (favouriteData || []).map((item) => item.resource_id)
        );
      }

      const counts: Record<number, number> = {};

      for (const item of [
        ...loadedNotes,
        ...loadedPapers,
        ...loadedAssignments,
        ...loadedVideos,
      ]) {
        const { data, error } = await supabase.rpc("get_like_count", {
          p_resource_id: item.id,
        });

        if (error) {
          console.error(
            `Error getting likes for resource ${item.id}:`,
            error
          );
          counts[item.id] = 0;
        } else {
          counts[item.id] = Number(data) || 0;
        }
      }

      setLikeCounts(counts);
      setLoading(false);
    }

    loadStudentData();
  }, [router]);

  async function handleView(filePath: string) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error);
      alert("Unable to open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function handleDownload(filePath: string) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      console.error("Error creating download URL:", error);
      alert("Unable to download this file.");
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = "";
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleFavourite(resourceId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to like a resource.");
      return;
    }

    const isFavourite = favourites.includes(resourceId);

    if (isFavourite) {
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);

      if (error) {
        console.error("Error removing like:", error);
        alert("Unable to remove like.");
        return;
      }

      setFavourites((current) =>
        current.filter((id) => id !== resourceId)
      );

      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max((current[resourceId] || 0) - 1, 0),
      }));
    } else {
      const { error } = await supabase.from("favourites").insert({
        user_id: user.id,
        resource_id: resourceId,
      });

      if (error) {
        console.error("Error adding like:", error);
        alert("Unable to like this resource.");
        return;
      }

      setFavourites((current) => [...current, resourceId]);

      setLikeCounts((current) => ({
        ...current,
        [resourceId]: (current[resourceId] || 0) + 1,
      }));
    }
  }

  function renderPdfSection(section: {
    title: string;
    description: string;
    items: PdfResource[];
    viewAllPath: string;
    emptyTitle: string;
    emptyText: string;
  }) {
    const { items } = section;

    return (
      <section className="mt-10 sm:mt-12">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#24344D] dark:text-[#E5EAF1]">
              {section.title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-[#8B98AA]">
              {section.description}
            </p>
          </div>

          {programmeName && (
            <Link
              href={`${programmeHref(programmeName)}/${section.viewAllPath}`}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#D9DEE7] dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-2 text-sm font-semibold text-[#294C78] dark:text-[#9CB9E3] shadow-sm transition hover:border-[#B8C9DF] dark:hover:border-[#33445A] hover:bg-[#F0F4FA] dark:hover:bg-[#1D2938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#456FAD] focus-visible:ring-offset-2"
            >
              View all {section.title.replace("Available ", "").toLowerCase()}
            </Link>
          )}
        </div>

        <div>
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-[#8B98AA]">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] py-12 text-center">
              <p className="text-sm font-medium text-[#24344D] dark:text-[#E5EAF1]">
                {section.emptyTitle}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-[#8B98AA]">
                {section.emptyText}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((note) => {
                const isFavourite = favourites.includes(note.id);
                const likes = likeCounts[note.id] || 0;

                return (
                  <div
                    key={note.id}
                    className="flex min-h-[205px] flex-col rounded-2xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D5E7] dark:hover:border-[#33445A] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#24344D] dark:text-[#E5EAF1]">
                        {note.title || note.topic}
                      </h3>

                      <span className="shrink-0 rounded-full bg-[#E7EEF8] dark:bg-[#1E3150] px-2 py-1 text-[10px] font-medium text-[#294C78] dark:text-[#9CB9E3]">
                        Note
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 min-h-5 text-xs leading-5 text-slate-500 dark:text-[#8B98AA]">
                      {note.module_name || "Unknown Module"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#8B98AA]">
                      <span>Year {note.year}</span>
                      <span>Semester {note.semester}</span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 border-t border-[#F0EEE8] dark:border-[#263345] pt-4">
                      <button
                        onClick={() => handleView(note.file_path)}
                        className="flex-1 rounded-lg bg-[#294C78] px-2 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#203B60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294C78]/40 focus-visible:ring-offset-2"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleDownload(note.file_path)}
                        className="flex-1 rounded-lg border border-[#D9DEE7] dark:border-[#263345] bg-white dark:bg-[#172130] px-2 py-2.5 text-xs font-semibold text-[#294C78] dark:text-[#9CB9E3] transition-colors hover:bg-[#F0F4FA] dark:hover:bg-[#1D2938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294C78]/30 focus-visible:ring-offset-2"
                      >
                        Download
                      </button>

                      <button
                        onClick={() => handleFavourite(note.id)}
                        title={isFavourite ? "Unlike" : "Like"}
                        aria-label={`${isFavourite ? "Unlike" : "Like"} ${note.title || note.topic}; ${likes} likes`}
                        aria-pressed={isFavourite}
                        className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                          isFavourite
                            ? "border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400"
                            : "border-[#D9DEE7] dark:border-[#263345] text-slate-500 dark:text-[#8B98AA] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400"
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
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-full bg-[#FCFBF8] dark:bg-[#0E141D] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Existing welcome and search header */}
        <WelcomeHeader name={fullName} />

        {renderPdfSection({
          title: "Available Notes",
          description: "Browse recently available study materials.",
          items: notes,
          viewAllPath: "notes",
          emptyTitle: "No notes available yet.",
          emptyText: "Approved notes for your programme will appear here.",
        })}

        {renderPdfSection({
          title: "Available Question Papers",
          description: "Past examination papers for your programme.",
          items: questionPapers,
          viewAllPath: "question-papers",
          emptyTitle: "No question papers available yet.",
          emptyText:
            "Approved question papers for your programme will appear here.",
        })}

        {renderPdfSection({
          title: "Available Assignments",
          description: "Assignments and coursework for your programme.",
          items: assignments,
          viewAllPath: "assignments",
          emptyTitle: "No assignments available yet.",
          emptyText:
            "Approved assignments for your programme will appear here.",
        })}

        {!loading && videos.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[#24344D] dark:text-[#E5EAF1]">
                  Latest Videos
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-[#8B98AA]">
                  Video lessons added by your programme admins.
                </p>
              </div>

              {programmeName && (
                <Link
                  href={`${programmeHref(programmeName)}/videos`}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#D9DEE7] dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-2 text-sm font-semibold text-[#294C78] dark:text-[#9CB9E3] shadow-sm transition hover:border-[#B8C9DF] dark:hover:border-[#33445A] hover:bg-[#F0F4FA] dark:hover:bg-[#1D2938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#456FAD] focus-visible:ring-offset-2"
                >
                  View all videos 
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {videos.map((video) => {
                const isFavourite = favourites.includes(video.id);
                const likes = likeCounts[video.id] || 0;

                return (
                  <div
                    key={video.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C8D5E7] dark:hover:border-[#33445A] hover:shadow-md"
                  >
                    <a
                      href={youTubeWatchUrl(video.video_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={youTubeThumbnail(video.video_id)}
                        alt={video.title || video.topic}
                        loading="lazy"
                        className="aspect-video w-full bg-[#F0F2F5] dark:bg-[#1D2938] object-cover"
                      />

                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 dark:bg-[#3A649C]/0 transition group-hover:bg-black/20 dark:group-hover:bg-[#3A649C]/20">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 dark:bg-[#3A649C]/70 text-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="ml-0.5 h-5 w-5"
                          >
                            <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                          </svg>
                        </span>
                      </span>
                    </a>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#24344D] dark:text-[#E5EAF1]">
                        {video.title || video.topic}
                      </h3>

                      <p className="mt-2 text-xs text-slate-500 dark:text-[#8B98AA]">
                        Year {video.year} · Semester {video.semester}
                      </p>

                      <div className="mt-auto flex items-center gap-2 border-t border-[#E7E5DF] dark:border-[#263345] pt-3">
                        <a
                          href={youTubeWatchUrl(video.video_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-md bg-[#294C78] px-2 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-[#203B60]"
                        >
                          Watch
                        </a>

                        <button
                          onClick={() => handleFavourite(video.id)}
                          title={isFavourite ? "Unlike" : "Like"}
                          aria-label={`${isFavourite ? "Unlike" : "Like"} ${video.title || video.topic}; ${likes} likes`}
                          aria-pressed={isFavourite}
                          className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                            isFavourite
                              ? "border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400"
                              : "border-[#D9DEE7] dark:border-[#263345] text-slate-500 dark:text-[#8B98AA] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400"
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

                          <span className="text-xs leading-none">
                            {likes}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
