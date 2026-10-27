// Live "Weak / Fair / Strong" meter shown under a new-password field.

import { getPasswordStrength, MIN_PASSWORD_LENGTH } from "@/lib/authRules";

const COLOURS = {
  "too-short": { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  weak: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  fair: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  strong: { bar: "bg-green-600", text: "text-green-700 dark:text-green-400" },
};

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) {
    return (
      <p className="mt-1 text-xs text-gray-400 dark:text-[#6B788A]">
        At least {MIN_PASSWORD_LENGTH} characters. Mix letters, numbers and symbols for a strong password.
      </p>
    );
  }

  const strength = getPasswordStrength(password);
  const colours = COLOURS[strength.level];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={`h-1.5 flex-1 rounded-full ${
              bar <= strength.score ? colours.bar : "bg-gray-200 dark:bg-[#263446]"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs">
        <span className={`font-semibold ${colours.text}`}>
          {strength.label === "Too short" ? "Too short" : `${strength.label} password`}
        </span>
        {strength.hint && (
          <span className="text-gray-500 dark:text-[#8B98AA]"> · {strength.hint}</span>
        )}
      </p>
    </div>
  );
}
