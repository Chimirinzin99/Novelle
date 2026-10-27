// Hint under a sign-up email field: explains the CST email format, then
// confirms whether what was typed is a student or a lecturer email.

import { cstAccountType, CST_EMAIL_HINT } from "@/lib/authRules";

export default function CstEmailHint({ email }: { email: string }) {
  const typed = email.trim();
  const type = cstAccountType(typed);

  if (type) {
    return (
      <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">
        ✓ {type === "student" ? "Student" : "Lecturer"} email
      </p>
    );
  }

  // Only complain once they have typed the "@" part.
  if (typed.includes("@")) {
    return (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
        Not a CST email. {CST_EMAIL_HINT}
      </p>
    );
  }

  return (
    <p className="mt-1 text-xs text-gray-500 dark:text-[#8B98AA]">{CST_EMAIL_HINT}</p>
  );
}
