// lib/notifications.ts — Part 13c: notifications now come from the database
// (table public.notifications, migration 012) instead of localStorage.
//
// - The BACKEND writes them: pending (on upload), approved, rejected + reason.
// - The browser only READS its own rows and marks them read (read_at).
//   RLS + column grants in 012 make sure it can't do anything else.
// - The bell (components/Sidebar.tsx) calls fetchNotifications().
//
// The two Settings toggles stay in localStorage (they are display choices
// for this device): "In-app notifications" hides the bell's list,
// "Pending updates" hides the "waiting for review" ones.

import { supabase } from "@/lib/supabase";

export type NotificationKind = "pending" | "approved" | "rejected";

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const NOTIFICATIONS_EVENT = "novelle:notifications-updated";
const PREFERENCES_KEY = "novelle:notification-preferences";
const OLD_STORAGE_KEY = "novelle:notifications"; // the pre-13c browser list
const BELL_LIMIT = 20; // newest 20 in the bell

// ---------------------------------------------------------------------------
// Settings toggles (this device only)
// ---------------------------------------------------------------------------

export type NotificationPreferences = {
  inApp: boolean;
  uploadUpdates: boolean; // show "pending" notifications
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  uploadUpdates: true,
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    const value = stored ? JSON.parse(stored) : {};
    return {
      inApp: typeof value.inApp === "boolean" ? value.inApp : true,
      uploadUpdates:
        typeof value.uploadUpdates === "boolean" ? value.uploadUpdates : true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    /* ignore — storage may be blocked */
  }
  tellBellToRefresh(); // the bell re-reads with the new choices
}

// ---------------------------------------------------------------------------
// Reading and marking read
// ---------------------------------------------------------------------------

function tellBellToRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
  }
}

type NotificationRow = {
  id: number;
  kind: NotificationKind;
  message: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

// The logged-in user's newest notifications (RLS returns only their own).
// Returns [] when logged out, on error, or when in-app notifications are off.
export async function fetchNotifications(): Promise<AppNotification[]> {
  if (typeof window === "undefined") return [];

  // One-time tidy-up: the old browser-only list is no longer used.
  try {
    window.localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  const preferences = getNotificationPreferences();
  if (!preferences.inApp) return [];

  // getSession() reads the saved login (no network call).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, message, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(BELL_LIMIT);

  if (error) {
    console.error("Could not load notifications:", error);
    return [];
  }

  return ((data ?? []) as NotificationRow[])
    .filter((row) => preferences.uploadUpdates || row.kind !== "pending")
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      message: row.message,
      href: row.href,
      createdAt: row.created_at,
      read: row.read_at !== null,
    }));
}

// Marks one notification read. Only read_at can change (migration 012).
export async function markNotificationRead(id: number) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) console.error("Could not mark notification read:", error);
  tellBellToRefresh();
}

// Marks all of the user's unread notifications read.
export async function markAllNotificationsRead() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.user.id)
    .is("read_at", null);

  if (error) console.error("Could not mark notifications read:", error);
  tellBellToRefresh();
}

export const notificationsUpdatedEvent = NOTIFICATIONS_EVENT;