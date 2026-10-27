import { writeStoredPreference } from "@/lib/storedPreference";

export type AppNotification = {
  id: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = "novelle:notifications";
const NOTIFICATIONS_EVENT = "novelle:notifications-updated";
export const NOTIFICATION_PREFERENCES_KEY = "novelle:notification-preferences";
const PREFERENCES_KEY = NOTIFICATION_PREFERENCES_KEY;

export type NotificationPreferences = {
  inApp: boolean;
  uploadUpdates: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  uploadUpdates: true,
};

// Turns the saved JSON text into preferences (missing values default to on).
export function parseNotificationPreferences(
  stored: string | null
): NotificationPreferences {
  try {
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

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    return parseNotificationPreferences(window.localStorage.getItem(PREFERENCES_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences
) {
  if (typeof window === "undefined") return;
  writeStoredPreference(PREFERENCES_KEY, JSON.stringify(preferences));
}

function isAppNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<AppNotification>;
  return (
    typeof item.id === "string" &&
    typeof item.message === "string" &&
    typeof item.href === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.read === "boolean"
  );
}

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isAppNotification) : [];
  } catch (error) {
    console.error("Could not read notifications:", error);
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
  } catch (error) {
    console.error("Could not save notification:", error);
  }
}

export function addNotification(
  message: string,
  href: string,
  category: "upload" = "upload"
) {
  const preferences = getNotificationPreferences();
  if (!preferences.inApp || (category === "upload" && !preferences.uploadUpdates)) {
    return;
  }
  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    message,
    href,
    createdAt: new Date().toISOString(),
    read: false,
  };

  saveNotifications([notification, ...getNotifications()].slice(0, 20));
}

export function markNotificationRead(id: string) {
  saveNotifications(
    getNotifications().map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    )
  );
}

export function markAllNotificationsRead() {
  saveNotifications(
    getNotifications().map((notification) => ({
      ...notification,
      read: true,
    }))
  );
}

export const notificationsUpdatedEvent = NOTIFICATIONS_EVENT;
