"use client";

// Small settings saved in this browser's localStorage (text size, reduce
// motion, notification choices). Components read them with
// useStoredPreference(), which re-renders whenever one is saved, here or in
// another tab, without copying the value into state inside an effect.

import { useSyncExternalStore } from "react";

const PREFERENCE_CHANGED_EVENT = "novelle:preference-changed";

export function readStoredPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked (e.g. private mode)
  }
}

export function writeStoredPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the change still applies until the page is reloaded.
  }
  window.dispatchEvent(new Event(PREFERENCE_CHANGED_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(PREFERENCE_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange); // changed in another tab
  return () => {
    window.removeEventListener(PREFERENCE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The saved text for `key`, or null when nothing is saved. Always null while
// rendering on the server.
export function useStoredPreference(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStoredPreference(key),
    () => null
  );
}
