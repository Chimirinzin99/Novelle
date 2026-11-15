// lib/author.ts — Part 13d: author credit + Solved/Unsolved in ONE place
// (13d-3 adds authorFormFrom, authorJson, sameAuthor at the bottom)
// for the frontend. Same codes as backend/src/utils/author.ts and the CHECK
// constraints in database/migrations/013_author_and_solved.sql.

export type AuthorType = "self" | "other" | "unknown";

export const MAX_AUTHOR_NAME = 80;

// Only these resource types can be Solved / Unsolved.
export const SOLVABLE_TYPES = ["question_paper", "assignment"] as const;

export const isSolvableType = (type: string | null | undefined) =>
  (SOLVABLE_TYPES as readonly string[]).includes(type ?? "");

// The "By …" line on a card, or null when there is nothing to show.
//   self + name    -> "By Ashis"        (uploader ticked "show my name")
//   self, no name  -> "By a student"
//   other + name   -> "By Mr. Dorji"
//   unknown / none -> null (no line)
export function authorCredit(
  authorType: string | null | undefined,
  authorName: string | null | undefined
): string | null {
  const name = authorName?.trim();
  if (authorType === "other" && name) return `By ${name}`;
  if (authorType === "self") return name ? `By ${name}` : "By a student";
  return null;
}

// Text + colours of the Solved / Unsolved tag (green = has answers).
export function solvedTag(isSolved: boolean | null | undefined) {
  return isSolved
    ? { text: "Solved", className: "bg-green-50 text-green-800 border border-green-200" }
    : { text: "Unsolved", className: "bg-white text-ink-soft border border-line" };
}

// Shape of the author fields the backend accepts (FormData or JSON).
export type AuthorForm = {
  authorType: AuthorType | null; // null = not chosen yet
  authorName: string; // used for "other"
  showName: boolean; // used for "self"
};

// A fresh form: nothing chosen, name hidden.
export const EMPTY_AUTHOR_FORM: AuthorForm = {
  authorType: null,
  authorName: "",
  showName: false,
};

// Adds the author fields to a FormData for the backend.
export function appendAuthorFields(form: FormData, author: AuthorForm) {
  if (!author.authorType) return; // nothing chosen: send nothing
  form.append("author_type", author.authorType);
  if (author.authorType === "other") form.append("author_name", author.authorName.trim());
  if (author.authorType === "self") form.append("show_author_name", String(author.showName));
}

// Separate from the author so a form can send it on its own.
export function appendSolvedField(form: FormData, isSolved: boolean) {
  form.append("is_solved", String(isSolved));
}

// Checks the form before sending; returns an error message or "".
export function authorFormError(author: AuthorForm): string {
  if (!author.authorType) return "Please choose who made it.";
  if (author.authorType !== "other") return "";
  const name = author.authorName.trim();
  if (!name) return "Please enter who made it.";
  if (name.length > MAX_AUTHOR_NAME) {
    return `The author's name can be at most ${MAX_AUTHOR_NAME} characters.`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Part 13d-3: admin forms (approve, Edit, upload)
// ---------------------------------------------------------------------------

// Turns a saved credit (from the database) back into form values,
// e.g. to pre-fill the approve form or the Edit window.
export function authorFormFrom(
  authorType: string | null | undefined,
  authorName: string | null | undefined
): AuthorForm {
  const type: AuthorType | null =
    authorType === "self" || authorType === "other" || authorType === "unknown"
      ? authorType
      : null;
  return {
    authorType: type,
    authorName: type === "other" ? authorName ?? "" : "",
    showName: type === "self" && !!authorName,
  };
}

// The same fields as appendAuthorFields, for a JSON body.
// Returns {} when nothing is chosen (the backend then changes nothing).
export function authorJson(author: AuthorForm): Record<string, string | boolean> {
  if (!author.authorType) return {};
  const body: Record<string, string | boolean> = { author_type: author.authorType };
  if (author.authorType === "other") body.author_name = author.authorName.trim();
  if (author.authorType === "self") body.show_author_name = author.showName;
  return body;
}

// true when two forms would save the same credit (used by Edit to send
// only what changed).
export function sameAuthor(a: AuthorForm, b: AuthorForm): boolean {
  if (a.authorType !== b.authorType) return false;
  if (a.authorType === "other") return a.authorName.trim() === b.authorName.trim();
  if (a.authorType === "self") return a.showName === b.showName;
  return true;
}