
// The welcome heading + search box at the top of /home and /search.
// One component, so the two pages always look exactly the same.

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
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-[#E5EAF1]">
        
        Welcome to <span className="text-blue-600 dark:text-blue-300">Novelle</span>
        {name && `, ${name}`}
      </h1>

      <p className="mt-2 text-gray-500 dark:text-[#8B98AA]">
        Find notes, videos and learning resources from Cstians.
      </p>

      {/* Enter or "Search" goes to /search?q=... (all programmes).
          key: a fresh box whenever the query in the URL changes,
          so it shows the new text. */}
      <div className="mx-auto mt-7 max-w-2xl text-left">
        <SearchBox key={initialQuery} initialQuery={initialQuery} />
      </div>
    </div>
  );
}
