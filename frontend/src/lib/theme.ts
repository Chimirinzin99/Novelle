// lib/theme.ts — dark mode part (4 Nov 2026).
//
// The user's choice is saved in this browser (localStorage), like the font
// size and reduce-motion settings: "light", "dark" or "system" (follow the
// phone's / computer's own setting). Nothing is saved: "system".
// Dark mode itself = the class "dark" on <html>; app/globals.css gives the
// colour names their dark values under html.dark.

export const THEME_STORAGE_KEY = "novelle:theme";

export type ThemeChoice = "light" | "dark" | "system";

// Runs in <head> BEFORE the page is drawn (see app/layout.tsx), so a user
// in dark mode never sees a white flash on load. Plain old JavaScript in a
// string, because it runs before React. try/catch: storage can be blocked.
// Fired on window whenever the choice changes in this tab, so the Settings
// dropdown and the sidebar button stay in step with each other.
export const THEME_CHANGE_EVENT = "novelle:theme-change";

// The saved choice ("system" when nothing valid is saved or storage is blocked).
export function readThemeChoice(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage blocked: fall through
  }
  return "system";
}

// Is the phone / computer itself set to dark mode?
export function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Put the page in light or dark for this choice (class "dark" on <html>).
export function applyThemeChoice(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

// Save a new choice, apply it, and tell the other theme controls.
export function saveThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // storage blocked: still switch for this visit
  }
  applyThemeChoice(choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
