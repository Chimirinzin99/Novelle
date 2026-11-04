// Part 19: the pending-submissions count in the admin sidebar.
// One head count (no rows downloaded). RLS decides what an admin may count:
// a programme admin counts only their own programme, a super admin all of them
// (policy "Admins can view allowed submissions"), so no programme filter here.

import { supabase } from "@/lib/supabase";

// Pages fire this after approving or rejecting, so the sidebar badge updates
// at once instead of waiting for the next refresh.
export const PENDING_CHANGED_EVENT = "novelle:pending-changed";

export function announcePendingChanged() {
  window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
}

// Returns null if the count couldn't be loaded (the badge is then hidden).
export async function fetchPendingCount(): Promise<number | null> {
  const { count, error } = await supabase
    .from("resource_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    console.error("PENDING COUNT ERROR:", error.message);
    return null;
  }
  return count ?? 0;
}
