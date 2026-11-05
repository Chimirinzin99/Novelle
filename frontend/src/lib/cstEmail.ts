// lib/cstEmail.ts — Part 20 (5 Nov 2026): only CST email addresses.
// Keep alike with backend/src/constants/email.ts and migration 017.
//
// CST addresses end in ".cst@rub.edu.bt":
//   students  -> student ID:  02240334.cst@rub.edu.bt
//   lecturers -> their name:  pema.cst@rub.edu.bt (dots, - or _ allowed
//                             between parts: tshering.dorji.cst@rub.edu.bt)
// Other RUB colleges (other "@rub.edu.bt" addresses) can't register.
// Idea from Norzin's feature/signup-validation branch; group decision 5 Nov.
// The database enforces the same rule (profiles_email_cst_check), so this
// check is only for a friendly message before anything is sent.

export const CST_EMAIL_PATTERN = /^([0-9]+|[a-z]+([._-][a-z]+)*)\.cst@rub\.edu\.bt$/;

export const CST_EMAIL_PLACEHOLDER = "yourstudentid.cst@rub.edu.bt";

export const CST_EMAIL_HINT =
  "Students: your student ID (e.g. 02240334.cst@rub.edu.bt). Lecturers: your name (e.g. pema.cst@rub.edu.bt).";

export const CST_EMAIL_MESSAGE =
  "Please use your CST email: your student ID (e.g. 02240334.cst@rub.edu.bt), or your name if you are a lecturer (e.g. pema.cst@rub.edu.bt).";

// Spaces removed and lower case, as Supabase stores emails.
export function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isCstEmail(email: string): boolean {
  return CST_EMAIL_PATTERN.test(cleanEmail(email));
}
