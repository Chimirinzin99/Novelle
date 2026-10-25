"use client";

// The search input used on /home and on the /search page.
// Pressing Enter goes to /search?q=<what was typed>; the /search page reads
// q from the URL and runs the search.
// PDF preview part (user's request, 25 Oct): the Search button is gone. A
// magnifying glass sits inside the box, an "Enter ↵" hint on the right shows
// how to search, and phones get a "Search" key on the keyboard
// (enterKeyHint) — so the search still works without a button.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
    <form role="search" onSubmit={handleSubmit} className="relative">
      {/* Magnifying glass inside the box (decoration) */}
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
      />

      <input
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search notes, papers, videos, modules…"
        aria-label="Search resources (press Enter)"
        className="h-12 w-full rounded-xl border-2 border-sky-line bg-white pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
      />

      
    </form>
  );
}