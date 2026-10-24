"use client";

// The search input used on /home and on the /search page.
// Pressing Enter (or the Search button) goes to /search?q=<what was typed>;
// the /search page reads q from the URL and runs the search.

import { useState } from "react";
import { useRouter } from "next/navigation";

type SearchBoxProps = {
  // Text already in the box, e.g. the current query on the /search page.
  initialQuery?: string;
};

export default function SearchBox({ initialQuery = "" }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  // A <form> gives us "Enter submits" for free.
  // preventDefault() stops the browser from reloading the whole page.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    // encodeURIComponent makes spaces, "&" etc. safe inside a URL.
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    // role="search" tells screen readers this form is the site search.
    <form role="search" onSubmit={handleSubmit} className="flex gap-2.5">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search notes, papers, videos, modules…"
        aria-label="Search resources"
        className="h-12 min-w-0 flex-1 rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
      />

      {/* A visible button too: not everyone knows Enter searches. */}
      <button
        type="submit"
        className="h-12 shrink-0 rounded-xl bg-navy px-6 font-display text-sm font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint"
      >
        Search
      </button>
    </form>
  );
}