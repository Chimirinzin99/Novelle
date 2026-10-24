// The welcome heading + search box at the top of /home and /search.
// One component, so the two pages always look exactly the same.
// Part 12: left-aligned, navy Montserrat heading with the gold star from the
// logo, Novelle's tagline under it (as in the chosen design).

import SearchBox from "@/components/SearchBox";

type WelcomeHeaderProps = {
  name: string; // student's full name ("" while loading -> no ", name")
  initialQuery?: string; // text to show in the search box (the /search page)
};

export default function WelcomeHeader({
  name,
  initialQuery = "",
}: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-navy">
          <span>
            Welcome back{name && `, ${name}`}
          </span>
          {/* The four-point star from the logo, in star gold (decoration only) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 shrink-0"
          >
            <path
              d="M12 1.5c.6 5.2 3.3 9.3 10.5 10.5C15.3 13.2 12.6 17.3 12 22.5 11.4 17.3 8.7 13.2 1.5 12 8.7 10.8 11.4 6.7 12 1.5z"
              className="fill-gold"
            />
          </svg>
        </h1>

        <p className="text-base text-ink-soft">
          Share what you know, learn from your seniors, grow together.
        </p>
      </div>

      {/* Enter or "Search" goes to /search?q=... (all programmes).
          key: a fresh box whenever the query in the URL changes,
          so it shows the new text. */}
      <div className="max-w-2xl">
        <SearchBox key={initialQuery} initialQuery={initialQuery} />
      </div>
    </div>
  );
}