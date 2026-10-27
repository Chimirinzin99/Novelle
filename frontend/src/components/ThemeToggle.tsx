"use client";

// Sun / moon button that switches between light and dark mode.
// Used at the bottom of both sidebars; the same setting is in Settings.
//   variant="row"  -> icon + "Dark mode" / "Light mode" label (sidebar rows)
//   variant="icon" -> icon only (compact headers)

import { Moon, Sun } from "lucide-react";
import { toggleTheme, useTheme } from "@/lib/theme";

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-[#F0F2F5] hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#294C78]/30 dark:text-[#B4BFCD] dark:hover:bg-[#1D2938] dark:hover:text-[#E5EAF1]";

const ICON_CLASS =
  "rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-[#263345] dark:text-[#B4BFCD] dark:hover:bg-[#1D2938]";

export default function ThemeToggle({
  variant = "row",
  className,
}: {
  variant?: "row" | "icon";
  className?: string; // replaces the default styling for that variant
}) {
  const isDark = useTheme() === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const IconComponent = isDark ? Sun : Moon;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={className ?? ICON_CLASS}
      >
        <IconComponent className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className={className ?? ROW_CLASS}
    >
      <IconComponent className="h-5 w-5" aria-hidden="true" />
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
