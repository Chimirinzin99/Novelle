// The one list of resource types. Must match the CHECK constraints in
// database/migrations/ (004 for submissions, 005 for resources) and the
// labels in frontend/src/lib/resourceTypes.ts.
export const RESOURCE_TYPES = [
  "note",
  "question_paper",
  "assignment",
  "video", // YouTube link; admins only (Part 6)
] as const;

// "note" | "question_paper" | "assignment" | "video", built from the list
// above, so adding a type to the array automatically updates this type too.
export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Types students may submit (videos are admin-only). The database enforces
// the same rule: resource_submissions does not allow 'video'.
export const STUDENT_SUBMIT_TYPES: readonly ResourceType[] = [
  "note",
  "question_paper",
  "assignment",
];

// Type guard: returns true if `value` is one of the allowed types.
// After `if (isResourceType(x))`, TypeScript knows x is a ResourceType.
export const isResourceType = (value: unknown): value is ResourceType =>
  typeof value === "string" &&
  (RESOURCE_TYPES as readonly string[]).includes(value);