// utils/notifications.ts — Part 13c: writes a row in public.notifications
// (migration 012) so the student's bell can show it.
//
// Only the backend (service role) may insert notifications; the browser can
// only read its own and mark them read.
//
// "Best effort": if saving the notification fails we log it and carry on.
// The submission / approval / rejection itself already succeeded, so the
// request must not fail just because the bell couldn't be updated.

import { supabase } from "../config/supabase";

export type NotificationKind = "pending" | "approved" | "rejected";

type NewNotification = {
  userId: string | null; // the student; null if the account was deleted
  kind: NotificationKind;
  submissionId: number;
  message: string;
  href?: string; // where clicking it goes (default: My Submissions)
};

export async function notifyUser({
  userId,
  kind,
  submissionId,
  message,
  href = "/my-submissions",
}: NewNotification): Promise<void> {
  if (!userId) return; // nobody to tell

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    kind,
    submission_id: submissionId,
    message,
    href,
  });

  if (error) {
    console.error(`Could not save ${kind} notification:`, error);
  }
}

// Titles are typed by students; keep the message short.
export function shortTitle(title: string | null | undefined): string {
  const clean = (title ?? "").trim() || "Your submission";
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}