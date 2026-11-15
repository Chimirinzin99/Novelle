// Like / unlike a resource for the logged-in student (Part 12).
// One place for the database work, used by /home, the category pages and
// the videos page.
//
// Why it is faster than before:
//   - getSession() reads the login saved in this browser (no network call).
//     The old code called getUser(), which asks Supabase's server first —
//     one extra round trip on every click.
//   - The pages now update the heart and the count IMMEDIATELY ("optimistic
//     update") and only undo it if the database says no.
//
// The database still decides: RLS lets a student add/remove only their own
// favourites, and only while their account is active (Part 11).

import { supabase } from "@/lib/supabase";

// Returns null when it worked, or a message to show when it didn't.
export async function setLiked(resourceId: number, like: boolean): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user.id;
  if (!userId) return "Please log in to like a resource.";

  const { error } = like
    ? await supabase.from("favourites").insert({ user_id: userId, resource_id: resourceId })
    : await supabase.from("favourites").delete().eq("user_id", userId).eq("resource_id", resourceId);

  if (error) {
    console.error(like ? "Add like error:" : "Remove like error:", error);
    return like ? "Unable to like this resource." : "Unable to remove the like.";
  }
  return null;
}

// Part 19: like counts for many resources in ONE request (migration 016,
// get_like_counts). Before, each page asked get_like_count once per card;
// /home made ~20 round trips in a row. Resources with no likes are missing
// from the database answer, so every id starts at 0 here.
// If the request fails, all counts show 0 (the page still works).
export async function fetchLikeCounts(resourceIds: number[]): Promise<Record<number, number>> {
  const counts: Record<number, number> = {};
  for (const id of resourceIds) counts[id] = 0;
  if (resourceIds.length === 0) return counts;

  const { data, error } = await supabase.rpc("get_like_counts", { p_resource_ids: resourceIds });
  if (error) {
    console.error("Like counts error:", error);
    return counts;
  }
  for (const row of (data || []) as { resource_id: number; likes: number }[]) {
    counts[row.resource_id] = Number(row.likes) || 0;
  }
  return counts;
}
