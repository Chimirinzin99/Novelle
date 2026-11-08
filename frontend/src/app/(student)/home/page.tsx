"use client";

// Student home page (/home): own programme's newest notes, question papers,
// assignments and videos, each with "View all →".
// Part 12: cards are the shared <PdfCard /> and <VideoCard /> (theme colours,
// fixed type badges, gold Like button). Data loading is unchanged, except the
// video query now also reads module_name (shown on the card).
// Part 13d: PDF cards also show the author credit and Solved/Unsolved.
// PDF preview part: View opens the preview window instead of a new tab.
// Part 19: each PDF section asks the database for its newest 6 only (three
// small queries at the same time) instead of downloading every PDF of the
// programme and keeping 8 of them in the browser. Videos and the student's
// likes load at the same time, and all like counts come in ONE request
// (fetchLikeCounts) — about 4 round trips instead of ~25.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { downloadFile } from "@/lib/files";
import { fetchLikeCounts, setLiked } from "@/lib/likes";
import WelcomeHeader from "@/components/WelcomeHeader";
import PdfCard from "@/components/PdfCard";
import VideoCard from "@/components/VideoCard";
import CardSkeleton from "@/components/CardSkeleton";
import EmptyState from "@/components/EmptyState";
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
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
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

// Part 19: 6 per section (was 8). Cards sit 3 / 2 / 1 per row (laptop /
// tablet / phone), and 6 fills every row on all three, so no half-empty row.
const HOME_VIDEO_LIMIT = 6;
const HOME_SECTION_LIMIT = 6;

export default function Home() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [notes, setNotes] = useState<PdfResource[]>([]);
  const [questionPapers, setQuestionPapers] = useState<PdfResource[]>([]);
  const [assignments, setAssignments] = useState<PdfResource[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  // Part 21: how many of each type the programme has in total, for the
  // "All 24 notes" links (counted by the same queries, no extra request).
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  async function loadStudentData() {
    setLoading(true);

    // Part 19: getSession() reads the login saved in this browser (no network
    // call); getUser() asked Supabase's server first. The database rules still
    // check the token on every query below.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
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

    // Part 19: the newest HOME_SECTION_LIMIT of one type, limited by the
    // database (.limit), so the page never downloads the whole library.
    const newestOfType = (type: string) =>
      supabase
        .from("resources")
        .select(
          "id, title, topic, type, module_name, year, semester, file_path, author_type, author_name, is_solved",
          { count: "exact" }
        )
        .eq("programme_id", profile.programme_id)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(HOME_SECTION_LIMIT);

    // All five queries run at the same time (Promise.all), not one after another.
    const [notesResult, papersResult, assignmentsResult, videosResult, favouritesResult] =
      await Promise.all([
        newestOfType("note"),
        newestOfType("question_paper"),
        newestOfType("assignment"),
        supabase
          .from("resources")
          .select("id, title, topic, module_name, year, semester, video_id", { count: "exact" })
          .eq("programme_id", profile.programme_id)
          .eq("type", "video")
          .order("created_at", { ascending: false })
          .limit(HOME_VIDEO_LIMIT),
        supabase.from("favourites").select("resource_id").eq("user_id", user.id),
      ]);

    const resourcesError =
      notesResult.error || papersResult.error || assignmentsResult.error;
    if (resourcesError) {
      console.error("Error fetching resources:", resourcesError);
      setLoading(false);
      return;
    }

    const loadedNotes: PdfResource[] = notesResult.data || [];
    const loadedPapers: PdfResource[] = papersResult.data || [];
    const loadedAssignments: PdfResource[] = assignmentsResult.data || [];

    setNotes(loadedNotes);
    setTotals({
      notes: notesResult.count ?? loadedNotes.length,
      "question papers": papersResult.count ?? loadedPapers.length,
      assignments: assignmentsResult.count ?? loadedAssignments.length,
      videos: videosResult.count ?? (videosResult.data || []).length,
    });
    setQuestionPapers(loadedPapers);
    setAssignments(loadedAssignments);

    if (videosResult.error) {
      console.error("Error fetching videos:", videosResult.error);
    }

    const loadedVideos: Video[] = videosResult.data || [];
    setVideos(loadedVideos);

    if (favouritesResult.error) {
      console.error("Error fetching favourites:", favouritesResult.error);
    } else {
      setFavourites(
        (favouritesResult.data || []).map((item) => item.resource_id)
      );
    }

    // Part 19: every card's like count in one request
    const counts = await fetchLikeCounts(
      [...loadedNotes, ...loadedPapers, ...loadedAssignments, ...loadedVideos].map(
        (item) => item.id
      )
    );

    setLikeCounts(counts);
    setLoading(false);
  }

  // PDF preview part: View opens the preview window (usePreview), Download
  // saves the file (lib/files.ts). Both used to open a new tab.
  const { openPdf } = usePreview();

  async function handleDownload(filePath: string) {
    if (!(await downloadFile(filePath))) alert("Unable to download this file.");
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
      alert(problem);
    }
  }

  // Section heading + "View all →" link (same for every section).
  // "All 24 notes" (or "All notes" until the count is known).
  const allLabel = (label: string) =>
    !totals[label]
      ? `All ${label}` // not known yet, or none
      : totals[label] === 1
        ? `Only 1 ${label.replace(/s$/, "")}`
        : `All ${totals[label]} ${label}`;

  function sectionHeader(title: string, description: string, viewAllPath: string, viewAllLabel: string) {
    return (
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        </div>

        {/* Part 20: until the programme name loads, an invisible stand-in of
            the same size keeps the button's space, so the cards below don't
            jump when it appears (it used to pop in later). */}
        {/* Part 21: "All 24 notes" with a gold underline, instead of the
            template-style "View all notes →". */}
        {programmeName ? (
          <Link
            href={`${programmeHref(programmeName)}/${viewAllPath}`}
            className="w-fit py-2 text-[15px] font-bold text-navy underline decoration-gold decoration-2 underline-offset-[5px] outline-none transition hover:text-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            {allLabel(viewAllLabel)}
          </Link>
        ) : (
          <span aria-hidden="true" className="invisible w-fit py-2 text-[15px] font-bold">
            {allLabel(viewAllLabel)}
          </span>
        )}
      </div>
    );
  }

  // Cards: 1 column on phones, 2 on tablets, 3 on laptops and up (max 3).
  const grid = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3";

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

        {/* Part 20: placeholder cards (same size as the real ones) instead
            of a one-line "Loading…", so the page doesn't jump */}
        {loading ? (
          <CardSkeleton count={HOME_SECTION_LIMIT} label={`Loading ${section.viewAllLabel}…`} />
        ) : items.length === 0 ? (
          // Part 21: says what to do next (upload) instead of only "none yet"
          <EmptyState
            title={section.emptyTitle}
            text={section.emptyText}
            actionLabel="Upload"
            actionHref="/submit-note"
          />
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
                authorType={resource.author_type}
                authorName={resource.author_name}
                isSolved={resource.is_solved}
                onView={() => openPdf(resource.file_path, resource.title || resource.topic)}
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
          emptyTitle: "No notes yet",
          emptyText: "Have notes from an earlier semester? Upload them and help the next batch.",
        })}

        {renderPdfSection({
          title: "Available Question Papers",
          description: "Past examination papers for your programme.",
          items: questionPapers,
          viewAllPath: "question-papers",
          viewAllLabel: "question papers",
          emptyTitle: "No question papers yet",
          emptyText: "Sat an exam? Upload the paper and help the next batch.",
        })}

        {renderPdfSection({
          title: "Available Assignments",
          description: "Assignments and coursework for your programme.",
          items: assignments,
          viewAllPath: "assignments",
          viewAllLabel: "assignments",
          emptyTitle: "No assignments yet",
          emptyText: "Have an old assignment brief? Upload it and help the next batch.",
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
