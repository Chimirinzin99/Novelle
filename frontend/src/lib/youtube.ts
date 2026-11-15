// YouTube helpers for the frontend.
// parseYouTubeId is the same as backend/src/utils/youtube.ts — keep them
// alike. Here it is used to show a thumbnail preview before uploading;
// the backend checks the link again when it is saved.

// Exactly 11 letters, digits, "-" or "_" (same rule as the database).
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// Any common YouTube link -> its 11-character video ID, or null.
// e.g. youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
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
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const [, kind, value] = url.pathname.split("/");
      if (["shorts", "embed", "live", "v"].includes(kind)) {
        id = value ?? null;
      }
    }
  }

  return id && VIDEO_ID_PATTERN.test(id) ? id : null;
};

// Thumbnail image YouTube hosts for every video (480x360).
export const youTubeThumbnail = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

// Normal YouTube watch page.
export const youTubeWatchUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;