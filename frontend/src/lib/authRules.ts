// Rules shared by the sign-up, login and reset-password forms.

// CST emails:
//   students  -> student ID: 02250359.cst@rub.edu.bt
//   lecturers -> name:       yourname.cst@rub.edu.bt
export const STUDENT_EMAIL_EXAMPLE = "yourstudentid.cst@rub.edu.bt";
export const LECTURER_EMAIL_EXAMPLE = "yourname.cst@rub.edu.bt";

export const CST_EMAIL_HINT =
  "Students: your student ID (e.g. 02250359.cst@rub.edu.bt). Lecturers: your name (e.g. yourname.cst@rub.edu.bt).";

export const CST_EMAIL_ERROR =
  "Please use your CST email: your student ID if you are a student (e.g. 02250359.cst@rub.edu.bt), or your name if you are a lecturer (e.g. yourname.cst@rub.edu.bt).";

const STUDENT_EMAIL_PATTERN = /^\d+\.cst@rub\.edu\.bt$/;
const LECTURER_EMAIL_PATTERN = /^[a-z]+(?:[._-][a-z]+)*\.cst@rub\.edu\.bt$/;

export type CstAccountType = "student" | "lecturer";

// "student", "lecturer", or null when it isn't a valid CST email.
export function cstAccountType(email: string): CstAccountType | null {
  const clean = email.trim().toLowerCase();
  if (STUDENT_EMAIL_PATTERN.test(clean)) return "student";
  if (LECTURER_EMAIL_PATTERN.test(clean)) return "lecturer";
  return null;
}

export function isCstEmail(email: string): boolean {
  return cstAccountType(email) !== null;
}

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordStrength = {
  level: "too-short" | "weak" | "fair" | "strong";
  label: string;
  score: number; // 0-4, for the meter bars
  hint: string; // what would make it stronger ("" when strong)
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) {
    const left = MIN_PASSWORD_LENGTH - password.length;
    return {
      level: "too-short",
      label: "Too short",
      score: password.length === 0 ? 0 : 1,
      hint: `${left} more character${left === 1 ? "" : "s"} needed (at least ${MIN_PASSWORD_LENGTH}).`,
    };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  let points = variety;
  if (password.length >= 12) points += 1;

  const missing: string[] = [];
  if (!hasUpper) missing.push("a capital letter");
  if (!hasNumber) missing.push("a number");
  if (!hasSymbol) missing.push("a symbol like ! or #");
  const hint = missing.length
    ? `Add ${missing.slice(0, 2).join(" and ")} to make it stronger.`
    : password.length < 12
      ? "Use 12 or more characters to make it stronger."
      : "";

  if (points >= 4) return { level: "strong", label: "Strong", score: 4, hint: "" };
  if (points === 3) return { level: "fair", label: "Fair", score: 3, hint };
  return { level: "weak", label: "Weak", score: 2, hint };
}
