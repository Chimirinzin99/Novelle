// Address of the Express backend. Set NEXT_PUBLIC_BACKEND_URL in frontend/.env.local.
// Falls back to the local dev server so nothing breaks if it isn't set.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";