// The three user roles. Must match the CHECK constraint profiles_role_check in
// database/migrations/006_user_management.sql and frontend/src/lib/roles.ts.
export const ROLES = ["student", "programme_admin", "super_admin"] as const;

export type Role = (typeof ROLES)[number];

// Type guard: true if the value is one of the known roles.
export const isRole = (value: unknown): value is Role =>
  typeof value === "string" &&
  (ROLES as readonly string[]).includes(value);