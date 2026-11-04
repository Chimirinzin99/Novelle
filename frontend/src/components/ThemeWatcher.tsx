"use client";

// Dark mode part: keeps the theme right while the app is open (draws nothing).
// - "System" choice: follows the phone / computer when it switches between
//   light and dark (e.g. automatically at sunset).
// - Another tab changed the choice: apply it here too.
// Mounted once in app/layout.tsx. The first paint is handled earlier by the
// script in <head> (lib/theme.ts THEME_INIT_SCRIPT).

import { useEffect } from "react";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemeChoice,
  readThemeChoice,
} from "@/lib/theme";

export default function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const onSystemChange = () => {
      if (readThemeChoice() === "system") applyThemeChoice("system");
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        applyThemeChoice(readThemeChoice());
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      }
    };

    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
