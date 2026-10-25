"use client";

// /liked — everything the student has liked, from every programme.
// Part 12: drawn with the shared PageHeader, PdfCard, VideoCard and
// EmptyState; each card shows its programme as a link. The data code is
// unchanged. (Clicking the gold heart unlikes and removes the card.)
// Part 13d: PDF cards also show the author credit and Solved/Unsolved.
// PDF preview part: View opens the preview window instead of a new tab.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { downloadFile } from "@/lib/files";
import { programmeHref } from "@/lib/programmes";
import PageHeader from "@/components/PageHeader";
import PdfCard from "@/components/PdfCard";
import VideoCard from "@/components/VideoCard";
import EmptyState from "@/components/EmptyState";

// One row from favourites, with the liked resource (and its programme)
// joined in through the foreign keys.
type LikedItem = {
  id: number; // favourites.id — used to unlike
  created_at: string;
  resources: {
    id: number;
    title: string | null;
    topic: string;
    type: string;
    module_name: string | null;
    year: number | null;
    semester: number | null;
    file_path: string | null; // empty for videos
    video_id: string | null; // set only for videos
    author_type: string | null; // Part 13d
    author_name: string | null;
    is_solved: boolean;
    programmes: { name: string } | null;
  } | null;
};

export default function LikedPage() {
  const router = useRouter();

  const [items, setItems] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLiked();
  }, []);

  async function loadLiked() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Start from favourites and pull in the resource it points to,
    // and that resource's programme name — all in one request.
    const { data, error } = await supabase
      .from("favourites")
      .select(
        "id, created_at, resources(id, title, topic, type, module_name, year, semester, file_path, video_id, author_type, author_name, is_solved, programmes(name))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }); // most recently liked first

    if (error) {
      console.error("Load liked error:", error);
      setError("Could not load your liked resources.");
    } else {
      // If a resource was deleted or is not visible to this student,
      // "resources" comes back null — skip those.
      const rows = (data ?? []) as unknown as LikedItem[];
      setItems(rows.filter((row) => row.resources !== null));
    }

    setLoading(false);
  }

  // PDF preview part: View opens the preview window (usePreview), Download
  // saves the file (lib/files.ts). Both used to open a new tab.
  const { openPdf } = usePreview();

  async function downloadPdf(filePath: string) {
    if (!(await downloadFile(filePath))) alert("Could not download this file.");
  }

  // Unlike = delete this favourites row (allowed by the existing
  // "Users can remove their own favourites" policy), then drop it
  // from the list on screen without reloading everything.
  async function unlike(favouriteId: number) {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("id", favouriteId);

    if (error) {
      console.error("Unlike error:", error);
      alert("Could not remove this like.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== favouriteId));
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          backHref="/profile"
          backLabel="Back to profile"
          title="Liked"
          description="Notes, papers and videos you have liked, from every programme, in one place."
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
          <EmptyState title="Loading your liked resources…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing liked yet"
            text="Tap the heart on any note or video and it will show up here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => {
              // Safe: null resources were filtered out in loadLiked.
              const resource = item.resources!;
              // Admin uploads fill "topic"; approved submissions fill "title".
              const title = resource.title || resource.topic;

              // The programme it belongs to, as a link (likes can come
              // from any programme).
              const programmeLink = resource.programmes && (
                <Link
                  href={programmeHref(resource.programmes.name)}
                  className="w-fit rounded text-sm font-semibold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
                >
                  {resource.programmes.name}
                </Link>
              );

              return resource.video_id ? (
                <VideoCard
                  key={item.id}
                  title={title}
                  videoId={resource.video_id}
                  moduleName={resource.module_name}
                  year={resource.year}
                  semester={resource.semester}
                  extra={programmeLink}
                  liked
                  onLike={() => unlike(item.id)}
                />
              ) : (
                <PdfCard
                  key={item.id}
                  title={title}
                  type={resource.type}
                  moduleName={resource.module_name}
                  year={resource.year}
                  semester={resource.semester}
                  authorType={resource.author_type}
                  authorName={resource.author_name}
                  isSolved={resource.is_solved}
                  extra={programmeLink}
                  onView={() => resource.file_path && openPdf(resource.file_path, title)}
                  onDownload={() => resource.file_path && downloadPdf(resource.file_path)}
                  liked
                  onLike={() => unlike(item.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}