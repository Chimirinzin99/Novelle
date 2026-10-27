"use client";

// /search?q=... — searches resources in ALL programmes.
// A resource matches if q appears (any case) in its title, topic or module name.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WelcomeHeader from "@/components/WelcomeHeader";
import { programmeHref } from "@/lib/programmes";
import { resourceTypeLabel } from "@/lib/resourceTypes";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";

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
  programmes: { name: string } | null;
};

// Next.js rule: a page that reads the URL with useSearchParams() must be
// wrapped in <Suspense>, otherwise `npm run build` fails. Suspense shows
// the fallback until the URL's query is available.
export default function SearchPage() {
  return (
    <Suspense
      fallback={<p className="p-10 text-sm text-gray-500 dark:text-[#8B98AA]">Loading search...</p>}
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

  // These characters have special meaning inside Supabase's .or() filter
  // text (and % / * are wildcards), so replace them with spaces.
  const safeQuery = query.replace(/[%*,()"\\]/g, " ").trim();

  // New search text: reset the page while rendering (React's recommended
  // alternative to setting state inside the effect below).
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  if (searchedQuery !== safeQuery) {
    setSearchedQuery(safeQuery);
    setError("");
    setLoading(safeQuery !== "");
    if (!safeQuery) setResults([]);
  }

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

  // Search again whenever the ?q= text changes.
  useEffect(() => {
    if (!safeQuery) return;
    let cancelled = false;

    async function runSearch() {
      // ilike = case-insensitive "like"; %word% = "contains word".
      // .or("a,b,c") = match if ANY of the three is true.
      // The value is in double quotes so spaces in it are kept.
      const pattern = `"%${safeQuery}%"`;

      const { data, error: searchError } = await supabase
        .from("resources")
        .select(
          "id, title, topic, type, module_name, year, semester, file_path, video_id, programmes(name)"
        )
        .or(
          `title.ilike.${pattern},topic.ilike.${pattern},module_name.ilike.${pattern}`
        )
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT);

      if (cancelled) return; // a newer search has started

      if (searchError) {
        console.error("Search error:", searchError);
        setError("Search failed. Please try again.");
        setResults([]);
      } else {
        setResults((data ?? []) as unknown as Result[]);
      }

      setLoading(false);
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [safeQuery]);

  // Open (or download) a PDF through a short-lived signed link.
  async function openFile(filePath: string, download: boolean) {
    const { data, error: urlError } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 60, download ? { download: true } : undefined);

    if (urlError || !data) {
      console.error("Open file error:", urlError);
      setError("Could not open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  return (
    // Same outer layout as /home: centred column, max width 7xl.
    <main className="min-h-full bg-gray-200 dark:bg-[#263446] px-8 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Welcome + search box, shared with /home so both look the same */}
        <WelcomeHeader name={fullName} initialQuery={query} />

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-12">
          {!query ? (
            <p className="text-center text-sm text-gray-500 dark:text-[#8B98AA]">
              Type a word above — a topic, title or module name.
            </p>
          ) : loading ? (
            <p className="text-center text-sm text-gray-500 dark:text-[#8B98AA]">Searching...</p>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] py-12 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-[#8B98AA]">
                Try a shorter word or a module name.
              </p>
            </div>
          ) : (
            <>
              {/* Section heading, same style as "Available Notes" on /home */}
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E5EAF1]">
                  Results for &ldquo;{query}&rdquo;
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#8B98AA]">
                  {results.length === SEARCH_LIMIT
                    ? `Showing the first ${SEARCH_LIMIT} results.`
                    : `${results.length} ${results.length === 1 ? "result" : "results"} found.`}
                </p>
              </div>

              {/* Same grid and card style as the /home notes */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Videos get their YouTube thumbnail */}
                    {r.type === "video" && r.video_id && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={youTubeThumbnail(r.video_id)}
                        alt={r.title || r.topic}
                        loading="lazy"
                        className="aspect-video w-full bg-gray-100 dark:bg-[#1D2938] object-cover"
                      />
                    )}

                    <div className="flex min-h-[210px] flex-1 flex-col p-4">
                      <span className="w-fit rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                        {resourceTypeLabel(r.type)}
                      </span>

                      <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-[#E5EAF1]">
                        {r.title || r.topic}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-[#8B98AA]">
                        {r.module_name || "Unknown Module"}
                      </p>

                      {/* Programme name links to that programme's page */}
                      {r.programmes && (
                        <Link
                          href={programmeHref(r.programmes.name)}
                          className="text-xs text-blue-600 dark:text-blue-300 hover:underline"
                        >
                          {r.programmes.name}
                        </Link>
                      )}

                      {/* Year / Semester, spread like the /home cards */}
                      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 dark:text-[#6B788A]">
                        <span>Year {r.year}</span>
                        <span>Semester {r.semester}</span>
                      </div>

                      <div className="mt-auto flex items-center gap-2 border-t pt-3">
                        {r.type === "video" && r.video_id ? (
                          <a
                            href={youTubeWatchUrl(r.video_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-md bg-black dark:bg-[#3A649C] px-2 py-2 text-center text-xs font-medium text-white hover:bg-gray-700 dark:hover:bg-[#33598C]"
                          >
                            Watch on YouTube
                          </a>
                        ) : r.file_path ? (
                          <>
                            <button
                              onClick={() => openFile(r.file_path!, false)}
                              className="flex-1 rounded-md bg-black dark:bg-[#3A649C] px-2 py-2 text-xs font-medium text-white hover:bg-gray-700 dark:hover:bg-[#33598C]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openFile(r.file_path!, true)}
                              className="flex-1 rounded-md border border-gray-200 dark:border-[#263345] px-2 py-2 text-xs font-medium text-gray-600 dark:text-[#B4BFCD] hover:bg-gray-50 dark:hover:bg-[#1D2938]"
                            >
                              Download
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}