// utils/author.ts — Part 13d: author credit + Solved/Unsolved, read from a
// request body. Used by student uploads, approve, admin uploads and edit.
//
// Request fields (JSON or FormData — FormData sends everything as text):
//   author_type       "self" | "other" | "unknown"   ("" or null = clear)
//   author_name       the name, only for "other" (max 80 characters)
//   show_author_name  "true"/"false", only for "self": show the uploader's
//                     own name on the card, or "By a student"
//   is_solved         "true"/"false": the PDF includes answers
//
// For "self" the name is looked up HERE from the uploader's profile, never
// taken from the request — so nobody can type someone else's name as
// "I made this". Same rules as migration 013's CHECK constraints.

import { supabase } from "../config/supabase";

export const AUTHOR_TYPES = ["self", "other", "unknown"] as const;
export type AuthorType = (typeof AUTHOR_TYPES)[number];

export const MAX_AUTHOR_NAME = 80;

export type AuthorFields = {
  author_type: AuthorType | null;
  author_name: string | null;
};

// ok + fields       = save these
// ok + undefined    = author not sent (upload: leave empty; edit: no change)
// not ok + message  = send a 400 with this message
type AuthorResult =
  | { ok: true; fields: AuthorFields | undefined }
  | { ok: false; message: string };

// "true"/true -> true, "false"/false -> false, anything else -> undefined
export function readBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

export async function readAuthor(
  body: Record<string, unknown> | undefined,
  uploaderId: string | null // whose name "self" means
): Promise<AuthorResult> {
  const type = body?.author_type;

  if (type === undefined) return { ok: true, fields: undefined };

  // Clear the credit
  if (type === null || type === "") {
    return { ok: true, fields: { author_type: null, author_name: null } };
  }

  if (typeof type !== "string" || !(AUTHOR_TYPES as readonly string[]).includes(type)) {
    return { ok: false, message: "Invalid author choice." };
  }

  if (type === "unknown") {
    return { ok: true, fields: { author_type: "unknown", author_name: null } };
  }

  if (type === "other") {
    const name = typeof body?.author_name === "string" ? body.author_name.trim() : "";

    if (!name) {
      return { ok: false, message: "Please enter who made it." };
    }
    if (name.length > MAX_AUTHOR_NAME) {
      return {
        ok: false,
        message: `The author's name can be at most ${MAX_AUTHOR_NAME} characters.`,
      };
    }
    return { ok: true, fields: { author_type: "other", author_name: name } };
  }

  // type === "self"
  const showName = readBoolean(body?.show_author_name) === true;
  let name: string | null = null;

  if (showName && uploaderId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", uploaderId)
      .maybeSingle();

    if (error) console.error("Author name lookup error:", error);

    const fullName = data?.full_name?.trim() ?? "";
    name = fullName ? fullName.slice(0, MAX_AUTHOR_NAME) : null;
  }

  return { ok: true, fields: { author_type: "self", author_name: name } };
}