// The one list of resource types for the frontend. Codes must match
// backend/src/constants/resourceTypes.ts and the database CHECK constraint.
// To add a type later (e.g. Video), add one line here.
export const RESOURCE_TYPES = [
  { code: "note", label: "Note" },
  { code: "question_paper", label: "Question Paper" },
  { code: "assignment", label: "Assignment" },
] as const;

// "note" | "question_paper" | "assignment", derived from the list above.
export type ResourceTypeCode = (typeof RESOURCE_TYPES)[number]["code"];

// "question_paper" -> "Question Paper". Unknown codes are shown as-is.
export const resourceTypeLabel = (code: string | null | undefined) =>
  RESOURCE_TYPES.find((t) => t.code === code)?.label ?? code ?? "";