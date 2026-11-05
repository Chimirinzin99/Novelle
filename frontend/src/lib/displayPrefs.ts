// lib/displayPrefs.ts — Part 20 (5 Nov 2026).
//
// "Text size" and "Reduce motion" from the student Settings page. They are
// saved in this browser (localStorage) and shown as attributes on <html>
// (data-font-size, data-reduce-motion), which app/globals.css reads.
//
// Before Part 20 only the Settings page set those attributes, so after a
// reload on any other page (and on every admin page) the text went back to
// normal size. Now DISPLAY_PREFS_INIT_SCRIPT runs in <head> on EVERY page
// before it is drawn (see app/layout.tsx), like the dark-mode script.

export const FONT_SIZE_STORAGE_KEY = "novelle:font-size";
export const REDUCE_MOTION_STORAGE_KEY = "novelle:reduce-motion";

export type FontSize = "small" | "default" | "large";

// The saved text size ("default" when nothing valid is saved or storage is blocked).
export function readFontSize(): FontSize {
  try {
    const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (saved === "small" || saved === "large") return saved;
  } catch {
    // storage blocked: fall through
  }
  return "default";
}

export function readReduceMotion(): boolean {
  try {
    return window.localStorage.getItem(REDUCE_MOTION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

// Save + apply at once (the page doesn't need to reload).
export function saveFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size;
  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch {
    // storage blocked: still applied for this visit
  }
}

export function saveReduceMotion(reduce: boolean) {
  document.documentElement.dataset.reduceMotion = String(reduce);
  try {
    window.localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, String(reduce));
  } catch {
    // storage blocked: still applied for this visit
  }
}

// Plain JavaScript in a string, because it runs before React. try/catch:
// storage can be blocked.
export const DISPLAY_PREFS_INIT_SCRIPT = `(function(){try{var h=document.documentElement,f=localStorage.getItem("${FONT_SIZE_STORAGE_KEY}");h.dataset.fontSize=f==="small"||f==="large"?f:"default";h.dataset.reduceMotion=localStorage.getItem("${REDUCE_MOTION_STORAGE_KEY}")==="true"?"true":"false"}catch(e){}})();`;
