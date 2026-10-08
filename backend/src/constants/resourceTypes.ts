// The one list of resource types. Must match the CHECK constraint in
// database/migrations/004_resource_type_check.sql and the labels in
// frontend/src/lib/resourceTypes.ts.
export const RESOURCE_TYPES = ["note", "question_paper", "assignment"] as const;

// "note" | "question_paper" | "assignment", built from the list above,
// so adding a type to the array automatically updates this type too.
export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Type guard: returns true if `value` is one of the allowed types.
// After `if (isResourceType(x))`, TypeScript knows x is a ResourceType.
export const isResourceType = (value: unknown): value is ResourceType =>
  typeof value === "string" &&
  (RESOURCE_TYPES as readonly string[]).includes(value);