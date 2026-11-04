"use client";

// Dark mode part: the one-click sun/moon button at the bottom of both
// sidebars. It switches between Light and Dark (choosing "Same as device"
// is on Settings / My profile). The look comes from the sidebar
// (className), so it matches the links around it.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_CHANGE_EVENT, saveThemeChoice } from "@/lib/theme";

export default function ThemeToggle({ className }: { className: string }) {
  // What the page shows right now (class "dark" on <html>).
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    // "Same as device" can also flip when the device switches.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      media.removeEventListener("change", sync);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => saveThemeChoice(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      className={className}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
