// Kept apart from lib/theme.ts (a client module) so the server-rendered root
// layout can import it.

export const THEME_STORAGE_KEY = "novelle:theme";

// Runs in <head> before the page paints: applies the saved theme (or the
// operating system's) so dark-mode users never see a white flash.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;if(t==="dark")r.classList.add("dark");r.style.colorScheme=t}catch(e){}})();`;
