// Small helpers for talking to the Express backend.
//
// Without these, two everyday situations showed confusing browser errors:
//   - the backend is restarting (npm run dev restarts it after every backend
//     file change, git checkout, etc.) or not running at all
//       -> fetch fails with "NetworkError..." / "Failed to fetch"
//   - something answers that isn't our API (an HTML error page)
//       -> response.json() fails with "JSON.parse: unexpected character..."
// Both now become one clear message the pages can show as-is.

export const SERVER_UNAVAILABLE_MESSAGE =
  "Could not reach the server. The backend may be restarting or not running. Wait a few seconds and try again.";

// Same as fetch(), but a network failure becomes the clear message above.
export async function callBackend(
  input: string,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    console.error("Backend request failed:", error);
    throw new Error(SERVER_UNAVAILABLE_MESSAGE);
  }
}

// Same as response.json(), but a reply that isn't JSON becomes the clear
// message above instead of a JSON.parse error.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(response: Response): Promise<any> {
  const text = await response.text();

  // An empty reply (e.g. 204 No Content) is fine: treat it as {}.
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    console.error(
      `Backend sent a non-JSON reply (HTTP ${response.status}):`,
      text.slice(0, 200)
    );
    throw new Error(SERVER_UNAVAILABLE_MESSAGE);
  }
}