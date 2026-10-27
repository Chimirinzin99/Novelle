"use client";

// Light / dark theme, saved on this device.
// Until the user picks one, the theme follows the operating system setting.
// The class is first applied by the inline script in app/layout.tsx (before
// the page paints, so there is no white flash); this file keeps it in sync
// afterwards and lets any component read or change it.

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/themeScript";

export type Theme = "light" | "dark";

const themeChangedEvent = "novelle:theme-changed";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function savedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function getTheme(): Theme {
  return savedTheme() ?? systemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the theme still changes for this visit.
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(themeChangedEvent));
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    applyTheme(getTheme());
    onChange();
  };
  window.addEventListener(themeChangedEvent, onChange);
  window.addEventListener("storage", sync); // changed in another tab
  media.addEventListener("change", sync); // OS setting changed
  return () => {
    window.removeEventListener(themeChangedEvent, onChange);
    window.removeEventListener("storage", sync);
    media.removeEventListener("change", sync);
  };
}

// Current theme for a component. Renders "light" on the server, then the
// real value on the client.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
