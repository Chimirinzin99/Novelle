// The one list of resource types for the frontend. Codes must match
// backend/src/constants/resourceTypes.ts and the database CHECK constraints.
// To add a type later, add one line here.
//   studentCanSubmit: shown on the student submit page? (Videos are added
//   by admins only — the database also blocks video submissions.)
export const RESOURCE_TYPES = [
  { code: "note", label: "Note", studentCanSubmit: true },
  { code: "question_paper", label: "Question Paper", studentCanSubmit: true },
  { code: "assignment", label: "Assignment", studentCanSubmit: true },
  { code: "video", label: "Video", studentCanSubmit: false },
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