// Turns any common YouTube link into its 11-character video ID.
// Accepted examples (all give "dQw4w9WgXcQ"):
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s
//   https://youtu.be/dQw4w9WgXcQ
//   https://www.youtube.com/shorts/dQw4w9WgXcQ
//   https://www.youtube.com/embed/dQw4w9WgXcQ
//   youtube.com/live/dQw4w9WgXcQ   (https:// may be left out)
// Anything else (other websites, playlists, channels) returns null.
// The same function exists in frontend/src/lib/youtube.ts — keep them alike.

// Exactly 11 letters, digits, "-" or "_" (same rule as the database).
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const parseYouTubeId = (input: unknown): string | null => {
  if (typeof input !== "string") return null;

  const text = input.trim();
  if (!text) return null;

  // new URL() throws on invalid input, so wrap it in try/catch.
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  // "www.youtube.com" / "m.youtube.com" -> "youtube.com"
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    // https://youtu.be/<id>
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      // https://www.youtube.com/watch?v=<id>
      id = url.searchParams.get("v");
    } else {
      // https://www.youtube.com/shorts|embed|live|v/<id>
      const [, kind, value] = url.pathname.split("/");
      if (["shorts", "embed", "live", "v"].includes(kind)) {
        id = value ?? null;
      }
    }
  }

  return id && VIDEO_ID_PATTERN.test(id) ? id : null;
};