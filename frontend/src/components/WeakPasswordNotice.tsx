// components/WeakPasswordNotice.tsx — Part 13b: gold notice shown above the
// "change password" form when login found the password breaks the new rules
// (flag set by the login page, see lib/password.ts). The page decides when
// to show it; "Not now" just hides it for this tab.

import { ShieldAlert } from "lucide-react";

type Props = {
  onDismiss: () => void;
};

export default function WeakPasswordNotice({ onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-gold bg-gold-tint p-4 text-sm"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold text-gold-ink">Please update your password</p>
        <p className="mt-1 text-ink-soft">
          Novelle now needs passwords with at least 8 characters, a lowercase
          letter, an uppercase letter and a number. Your current password
          doesn&apos;t meet these rules — choose a new one below.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-gold-ink hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-soft"
      >
        Not now
      </button>
    </div>
  );
}