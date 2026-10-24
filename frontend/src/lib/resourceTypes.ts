// The one list of resource types for the frontend. Codes must match
// backend/src/constants/resourceTypes.ts and the database CHECK constraints.
// To add a type later, add one line here.
//   studentCanSubmit: shown on the student submit page? (Videos are added
//   by admins only — the database also blocks video submissions.)
//   badge: Tailwind classes for this type's badge (Part 12). Each type keeps
//   the SAME colour on every page, so students learn it at a glance. The
//   colours come from the theme in app/globals.css and differ in lightness,
//   not only in hue, so they can be told apart by colour-blind students too.
export const RESOURCE_TYPES = [
  {
    code: "note",
    label: "Note",
    studentCanSubmit: true,
    badge: "bg-sky-tint text-navy-soft",
  },
  {
    code: "question_paper",
    label: "Question Paper",
    studentCanSubmit: true,
    badge: "bg-navy text-white",
  },
  {
    code: "assignment",
    label: "Assignment",
    studentCanSubmit: true,
    badge: "bg-gold-tint text-gold-ink",
  },
  {
    code: "video",
    label: "Video",
    studentCanSubmit: false,
    badge: "bg-white text-ink border border-sky-line",
  },
] as const;

// "note" | "question_paper" | "assignment" | "video", derived from the list.
export type ResourceTypeCode = (typeof RESOURCE_TYPES)[number]["code"];

// The types offered on the student submit page.
export const STUDENT_SUBMIT_TYPES = RESOURCE_TYPES.filter(
  (t) => t.studentCanSubmit
);

// "question_paper" -> "Question Paper". Unknown codes are shown as-is.
export const resourceTypeLabel = (code: string | null | undefined) =>
  RESOURCE_TYPES.find((t) => t.code === code)?.label ?? code ?? "";

// Badge classes for a type; unknown codes get a plain grey badge.
export const resourceTypeBadge = (code: string | null | undefined) =>
  RESOURCE_TYPES.find((t) => t.code === code)?.badge ??
  "bg-white text-ink-soft border border-line";