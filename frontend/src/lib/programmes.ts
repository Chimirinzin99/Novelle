// Programme helpers shared by the sidebar and the programme pages.
//
// A programme's URL slug is made FROM its name in the database, e.g.
//   "Electronics and Communication Engineering" -> "electronics-and-communication-engineering"
// so we never have to turn a slug back into a name (that guess broke for
// "and" and for short slugs like "ece"). Instead, a page loads the programme
// list and picks the one whose slugified name equals the slug in the URL.

import { supabase } from "@/lib/supabase";

export type Programme = {
  id: number;
  name: string;
};

// "Information Technology" -> "information-technology"
// Lower-case, then every run of characters that isn't a letter or digit
// becomes one "-", then any "-" at the start or end is removed.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// URL of a programme's page, e.g. programmeHref("Software Engineering")
// -> "/programmes/software-engineering"
export function programmeHref(name: string): string {
  return `/programmes/${slugify(name)}`;
}

// Find the programme for a URL slug. Returns null if no programme matches.
// Only 10 programmes, so fetching them all and searching in the browser is
// simple and fast — no database change needed.
export async function findProgrammeBySlug(
  slug: string
): Promise<Programme | null> {
  const { data, error } = await supabase
    .from("programmes")
    .select("id, name");

  if (error || !data) {
    console.error("Programme list error:", error);
    return null;
  }

  return data.find((programme) => slugify(programme.name) === slug) ?? null;
}