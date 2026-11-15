// components/PasswordChecklist.tsx — Part 13a: strength bar + ticked rules
// shown under a "new password" box (register, reset password; later also
// Settings and admin Profile). It only DISPLAYS; the page still checks
// passwordMeetsRules() before saving.

import { Check, X } from "lucide-react";
import {
  PASSWORD_RULES,
  passwordStrength,
  type PasswordStrength,
} from "@/lib/password";

// How each strength level looks: label, how many of the 3 bar pieces are
// filled, and the colour (red = weak, gold = fair, green = strong).
const STRENGTH_STYLE: Record<
  PasswordStrength,
  { label: string; filled: number; bar: string; text: string }
> = {
  weak: { label: "Weak", filled: 1, bar: "bg-red-500", text: "text-red-700" },
  fair: { label: "Fair", filled: 2, bar: "bg-gold", text: "text-gold-ink" },
  strong: {
    label: "Strong",
    filled: 3,
    bar: "bg-green-600",
    text: "text-green-700",
  },
};

type Props = {
  password: string;
  id?: string; // lets the input point to this with aria-describedby
};

export default function PasswordChecklist({ password, id }: Props) {
  // Nothing typed yet: just show the rules, no bar.
  const typed = password.length > 0;
  const strength = STRENGTH_STYLE[passwordStrength(password)];

  return (
    <div id={id} className="mt-2 space-y-2" aria-live="polite">
      {typed && (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < strength.filled ? strength.bar : "bg-line"
                }`}
              />
            ))}
          </div>
          <span className={`text-xs font-bold ${strength.text}`}>
            {strength.label}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-xs ${
                ok ? "text-green-700" : "text-ink-soft"
              }`}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {rule.label}
              <span className="sr-only">{ok ? "(done)" : "(missing)"}</span>
            </li>
          );
        })}
      </ul>

      {typed && strength.label === "Fair" && (
        <p className="text-xs text-ink-soft">
          Tip: 12+ characters or a symbol (like ! or #) makes it strong.
        </p>
      )}
    </div>
  );
}