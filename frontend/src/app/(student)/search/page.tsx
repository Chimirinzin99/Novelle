"use client";

// /search?q=... — searches resources in ALL programmes.
// A resource matches if q appears (any case) in its title, topic or module name.
// Part 12: results use the shared PdfCard / VideoCard (no Like button here)
// with the programme as a link; the search code is unchanged.
// Part 13d: PDF cards also show the author credit and Solved/Unsolved.
// PDF preview part: View opens the preview window instead of a new tab.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePreview } from "@/components/PreviewProvider";
import { downloadFile } from "@/lib/files";
import WelcomeHeader from "@/components/WelcomeHeader";
import { programmeHref } from "@/lib/programmes";
import PdfCard from "@/components/PdfCard";
import VideoCard from "@/components/VideoCard";
import EmptyState from "@/components/EmptyState";

// Most results shown at once, so a one-letter search can't load everything.
const SEARCH_LIMIT = 50;

// One result row, with its programme's name joined in.
type Result = {
  id: number;
  title: string | null;
  topic: string;
  type: string;
  module_name: string | null;
  year: number | null;
  semester: number | null;
  file_path: string | null; // PDFs
  video_id: string | null; // videos
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
  programmes: { name: string } | null;
};

// Next.js rule: a page that reads the URL with useSearchParams() must be
// wrapped in <Suspense>, otherwise `npm run build` fails. Suspense shows
// the fallback until the URL's query is available.
export default function SearchPage() {
  return (
    <Suspense
      fallback={<p className="p-10 text-sm text-ink-soft">Loading search…</p>}
    >
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  // "?q=python" -> "python". Changes when the student searches again.
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    runSearch();
  }, [query]);

  // The student's name for the welcome heading (same as /home).
  // Runs once; a missing name just leaves the heading without ", name".
  useEffect(() => {
    async function loadName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setFullName(profile?.full_name ?? "");
    }

    loadName();
  }, []);

  async function runSearch() {
    setError("");

    // These characters have special meaning inside Supabase's .or() filter
    // text (and % / * are wildcards), so replace them with spaces.
    const safe = query.replace(/[%*,()"\\]/g, " ").trim();

    if (!safe) {
      setResults([]);
      return;
    }

    setLoading(true);

    // ilike = case-insensitive "like"; %word% = "contains word".
    // .or("a,b,c") = match if ANY of the three is true.
    // The value is in double quotes so spaces in it are kept.
    const pattern = `"%${safe}%"`;

    const { data, error: searchError } = await supabase
      .from("resources")
      .select(
        "id, title, topic, type, module_name, year, semester, file_path, video_id, author_type, author_name, is_solved, programmes(name)"
      )
      .or(
        `title.ilike.${pattern},topic.ilike.${pattern},module_name.ilike.${pattern}`
      )
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT);

    if (searchError) {
      console.error("Search error:", searchError);
      setError("Search failed. Please try again.");
      setResults([]);
    } else {
      setResults((data ?? []) as unknown as Result[]);
    }

    setLoading(false);
  }

  // PDF preview part: View opens the preview window (usePreview), Download
  // saves the file (lib/files.ts). Both used to open a new tab.
  const { openPdf } = usePreview();

  async function downloadPdf(filePath: string) {
    if (!(await downloadFile(filePath))) setError("Could not download this file.");
  }

  return (
    // Same outer layout as /home.
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Welcome + search box, shared with /home so both look the same */}
        <WelcomeHeader name={fullName} initialQuery={query} />

        {error && (
          <div
            role="alert"
            className="mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <section className="mt-10">
          {!query ? (
            <EmptyState
              title="Search every programme"
              text="Type a word above — a topic, title or module name."
            />
          ) : loading ? (
            <EmptyState title="Searching…" />
          ) : results.length === 0 ? (
            <EmptyState
              title={`No results for “${query}”`}
              text="Try a shorter word or a module name."
            />
          ) : (
            <>
              {/* Section heading, same style as "Available Notes" on /home */}
              <div className="mb-4">
                <h2 className="text-[19px] font-bold text-navy">Results for &ldquo;{query}&rdquo;</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {results.length === SEARCH_LIMIT
                    ? `Showing the first ${SEARCH_LIMIT} results.`
                    : `${results.length} ${results.length === 1 ? "result" : "results"} found.`}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {results.map((r) => {
                  const title = r.title || r.topic;

                  // Search covers ALL programmes, so each card says which one.
                  const programmeLink = r.programmes && (
                    <Link
                      href={programmeHref(r.programmes.name)}
                      className="w-fit rounded text-sm font-semibold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
                    >
                      {r.programmes.name}
                    </Link>
                  );

                  return r.type === "video" && r.video_id ? (
                    <VideoCard
                      key={r.id}
                      title={title}
                      videoId={r.video_id}
                      moduleName={r.module_name}
                      year={r.year}
                      semester={r.semester}
                      extra={programmeLink}
                    />
                  ) : (
                    <PdfCard
                      key={r.id}
                      title={title}
                      type={r.type}
                      moduleName={r.module_name}
                      year={r.year}
                      semester={r.semester}
                      authorType={r.author_type}
                      authorName={r.author_name}
                      isSolved={r.is_solved}
                      extra={programmeLink}
                      onView={() => r.file_path && openPdf(r.file_path, title)}
                      onDownload={() => r.file_path && downloadPdf(r.file_path)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}