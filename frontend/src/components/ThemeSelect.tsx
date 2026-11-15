"use client";

// Dark mode part: the Light / Dark / System dropdown on Settings (students)
// and My profile (admins). Saving happens at once (lib/theme.ts); the
// sidebar's sun/moon button and this dropdown keep each other in step.

import { useEffect, useState } from "react";
import {
  THEME_CHANGE_EVENT,
  readThemeChoice,
  saveThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

export default function ThemeSelect({
  id,
  className,
}: {
  id?: string;
  className: string;
}) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const sync = () => setChoice(readThemeChoice());
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  return (
    <select
      id={id}
      value={choice}
      onChange={(event) => saveThemeChoice(event.target.value as ThemeChoice)}
      aria-label="Theme"
      className={className}
    >
      <option value="system">Same as device</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
