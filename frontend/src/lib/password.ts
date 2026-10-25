// lib/password.ts — Part 13a: the password rules in ONE place.
// Part 13b: adds the "weak password" flag used after login (bottom of file).
//
// The same rules are switched on in Supabase (Authentication -> Email ->
// Password requirements: minimum length 8 + "Lowercase, uppercase letters
// and digits"), so Supabase refuses a weak password even if someone skips
// our form. The checks here are only for friendly messages and the
// checklist under the password box (components/PasswordChecklist.tsx).

import { isAdminRole } from "@/lib/roles";

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordRule = {
  id: string;
  label: string; // shown in the checklist
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (p) => p.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "lower",
    label: "A lowercase letter (a–z)",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "upper",
    label: "An uppercase letter (A–Z)",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "digit",
    label: "A number (0–9)",
    test: (p) => /[0-9]/.test(p),
  },
];

// true when every rule passes (the password may be saved)
export function passwordMeetsRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export type PasswordStrength = "weak" | "fair" | "strong";

// Weak   = at least one rule fails (Supabase would refuse it)
// Fair   = all rules pass
// Strong = all rules pass AND (12+ characters OR a symbol like ! @ # ?)
export function passwordStrength(password: string): PasswordStrength {
  if (!passwordMeetsRules(password)) return "weak";

  const longEnough = password.length >= 12;
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return longEnough || hasSymbol ? "strong" : "fair";
}

// One message for the error box when the password breaks a rule.
export const PASSWORD_RULES_MESSAGE =
  `Your password needs at least ${MIN_PASSWORD_LENGTH} characters, ` +
  "a lowercase letter, an uppercase letter and a number.";

// Supabase's error code when it refuses a password that breaks the rules.
export const WEAK_PASSWORD_CODE = "weak_password";

// ---------------------------------------------------------------------------
// Part 13b: weak password from before the rules
//
// Old accounts may still have a password made under the old rule (6+
// characters). Supabase still lets them log in, so after login we check the
// password they typed. If it breaks a rule we remember that in
// sessionStorage (this browser tab only) and send them to the page where
// they can change it; that page shows a gold notice until they do.
// ---------------------------------------------------------------------------

const WEAK_PASSWORD_FLAG = "novelle:weak-password";

// Where each role changes their password.
export function passwordChangePathForRole(role: string | null | undefined) {
  return isAdminRole(role) ? "/admin/profile" : "/settings";
}

// sessionStorage can throw (private mode, blocked storage), so every call
// is wrapped in try/catch — the notice is a nice extra, never a blocker.
export function markWeakPassword() {
  try {
    window.sessionStorage.setItem(WEAK_PASSWORD_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function hasWeakPasswordFlag(): boolean {
  try {
    return window.sessionStorage.getItem(WEAK_PASSWORD_FLAG) === "1";
  } catch {
    return false;
  }
}

export function clearWeakPasswordFlag() {
  try {
    window.sessionStorage.removeItem(WEAK_PASSWORD_FLAG);
  } catch {
    /* ignore */
  }
}