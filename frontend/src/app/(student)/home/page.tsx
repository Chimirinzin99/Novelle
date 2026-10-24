"use client";

// Student home page (/home): own programme's newest notes, question papers,
// assignments and videos, each with "View all →".
// Part 12: cards are the shared <PdfCard /> and <VideoCard /> (theme colours,
// fixed type badges, gold Like button). Data loading is unchanged, except the
// video query now also reads module_name (shown on the card).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setLiked } from "@/lib/likes";
import WelcomeHeader from "@/components/WelcomeHeader";
import PdfCard from "@/components/PdfCard";
import VideoCard from "@/components/VideoCard";
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
  module_name: string | null;
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
    loadStudentData();
  }, []);

  async function loadStudentData() {
    setLoading(true);

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
      .select("id, title, topic, module_name, year, semester, video_id")
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
      alert(problem);
    }
  }

  // Section heading + "View all →" link (same for every section).
  function sectionHeader(title: string, description: string, viewAllPath: string, viewAllLabel: string) {
    return (
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[19px] font-bold text-navy">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        </div>

        {/* Hidden until the student's programme name has loaded */}
        {programmeName && (
          <Link
            href={`${programmeHref(programmeName)}/${viewAllPath}`}
            className="w-fit rounded text-[15px] font-bold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            View all {viewAllLabel} →
          </Link>
        )}
      </div>
    );
  }

  // Cards: 1 column on phones, 2 on tablets, 3 on laptops, 4 on big screens.
  const grid = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  function renderPdfSection(section: {
    title: string;
    description: string;
    items: PdfResource[];
    viewAllPath: string;
    viewAllLabel: string;
    emptyTitle: string;
    emptyText: string;
  }) {
    const { items } = section;

    return (
      <section className="mt-10">
        {sectionHeader(section.title, section.description, section.viewAllPath, section.viewAllLabel)}

        {loading ? (
          <p className="py-10 text-center text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-line bg-white px-6 py-10 text-center">
            <p className="font-semibold text-ink">{section.emptyTitle}</p>
            <p className="mt-1 text-sm text-ink-soft">{section.emptyText}</p>
          </div>
        ) : (
          <div className={grid}>
            {items.map((resource) => (
              <PdfCard
                key={resource.id}
                title={resource.title || resource.topic}
                type={resource.type}
                moduleName={resource.module_name}
                year={resource.year}
                semester={resource.semester}
                onView={() => handleView(resource.file_path)}
                onDownload={() => handleDownload(resource.file_path)}
                liked={favourites.includes(resource.id)}
                likes={likeCounts[resource.id] || 0}
                onLike={() => handleFavourite(resource.id)}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <WelcomeHeader name={fullName} />

        {renderPdfSection({
          title: "Available Notes",
          description: "Browse recently available study materials.",
          items: notes,
          viewAllPath: "notes",
          viewAllLabel: "notes",
          emptyTitle: "No notes available yet.",
          emptyText: "Approved notes for your programme will appear here.",
        })}

        {renderPdfSection({
          title: "Available Question Papers",
          description: "Past examination papers for your programme.",
          items: questionPapers,
          viewAllPath: "question-papers",
          viewAllLabel: "question papers",
          emptyTitle: "No question papers available yet.",
          emptyText: "Approved question papers for your programme will appear here.",
        })}

        {renderPdfSection({
          title: "Available Assignments",
          description: "Assignments and coursework for your programme.",
          items: assignments,
          viewAllPath: "assignments",
          viewAllLabel: "assignments",
          emptyTitle: "No assignments available yet.",
          emptyText: "Approved assignments for your programme will appear here.",
        })}

        {/* Videos: the whole section is hidden when there are none */}
        {!loading && videos.length > 0 && (
          <section className="mt-10">
            {sectionHeader("Latest Videos", "Video lessons added by your programme admins.", "videos", "videos")}

            <div className={grid}>
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  title={video.title || video.topic}
                  videoId={video.video_id}
                  moduleName={video.module_name}
                  year={video.year}
                  semester={video.semester}
                  liked={favourites.includes(video.id)}
                  likes={likeCounts[video.id] || 0}
                  onLike={() => handleFavourite(video.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}