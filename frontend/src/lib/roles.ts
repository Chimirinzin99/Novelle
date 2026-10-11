// The one place that knows the user roles stored in profiles.role.
// Codes must match the database and backend/src/middleware/role.ts.
export const ROLES = {
  student: "student",
  programmeAdmin: "programme_admin",
  superAdmin: "super_admin",
} as const;

// "student" | "programme_admin" | "super_admin", derived from ROLES.
export type Role = (typeof ROLES)[keyof typeof ROLES];

// The role may be missing (no profile yet), so these accept null/undefined.
type MaybeRole = string | null | undefined;

// Programme admin or super admin: may open the /admin pages.
export const isAdminRole = (role: MaybeRole) =>
  role === ROLES.programmeAdmin || role === ROLES.superAdmin;

// Admin of one programme only.
export const isProgrammeAdminRole = (role: MaybeRole) =>
  role === ROLES.programmeAdmin;

// Admin of every programme.
export const isSuperAdminRole = (role: MaybeRole) =>
  role === ROLES.superAdmin;

// Where a logged-in user should land: admins -> /admin, everyone else -> /home.
export const homePathForRole = (role: MaybeRole) =>
  isAdminRole(role) ? "/admin" : "/home";