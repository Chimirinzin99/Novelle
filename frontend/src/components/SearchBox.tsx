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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search notes, papers, videos, modules..."
        aria-label="Search resources"
        className="w-full rounded-2xl border border-black dark:border-slate-400 bg-white dark:bg-[#172130] px-5 py-4 text-sm !text-black dark:!text-[#E5EAF1] placeholder:!text-gray-500 dark:placeholder:!text-[#8B98AA] shadow-md outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/60"
      />


    </form>
  );
}