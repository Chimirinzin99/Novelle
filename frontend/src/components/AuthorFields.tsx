// components/AuthorFields.tsx — Part 13d: "Who made it?" choice and the
// Solved checkbox, shared by the student submit page and (in 13d-3) the
// admin approve / edit / upload forms. It only DRAWS; the page keeps the
// values (lib/author.ts AuthorForm) and sends them to the backend.

import { MAX_AUTHOR_NAME, type AuthorForm, type AuthorType } from "@/lib/author";

type AuthorFieldsProps = {
  value: AuthorForm;
  onChange: (next: AuthorForm) => void;
  disabled?: boolean;
  idPrefix: string; // keeps ids unique when two forms are on one page
  selfLabel?: string; // e.g. "I made this" / "The student made it"
  // Text for the "show the name" tick box; leave out to hide the tick box.
  showNameLabel?: string;
};

const choiceClass = (selected: boolean) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-sky-tint ${
    selected ? "border-navy bg-sky-wash text-navy" : "border-sky-line bg-white text-ink hover:border-navy-soft"
  }`;

export default function AuthorFields({
  value,
  onChange,
  disabled,
  idPrefix,
  selfLabel = "I made this",
  showNameLabel,
}: AuthorFieldsProps) {
  const choices: { code: AuthorType; label: string }[] = [
    { code: "self", label: selfLabel },
    { code: "other", label: "Someone else made it" },
    { code: "unknown", label: "Not sure" },
  ];

  return (
    <div className="space-y-3">
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
        {choices.map((choice) => (
          <label key={choice.code} className={choiceClass(value.authorType === choice.code)}>
            <input
              type="radio"
              name={`${idPrefix}-author`}
              value={choice.code}
              checked={value.authorType === choice.code}
              onChange={() => onChange({ ...value, authorType: choice.code })}
              disabled={disabled}
              className="h-4 w-4 accent-navy"
            />
            {choice.label}
          </label>
        ))}
      </div>

      {value.authorType === "other" && (
        <div>
          <label htmlFor={`${idPrefix}-author-name`} className="mb-1.5 block text-sm font-medium text-ink-nav">
            Who made it?
          </label>
          <input
            id={`${idPrefix}-author-name`}
            type="text"
            value={value.authorName}
            onChange={(e) => onChange({ ...value, authorName: e.target.value })}
            placeholder="e.g. Mr. Dorji (lecturer) or a senior's name"
            maxLength={MAX_AUTHOR_NAME}
            disabled={disabled}
            className="h-11 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
          />
        </div>
      )}

      {value.authorType === "self" && showNameLabel && (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.showName}
            onChange={(e) => onChange({ ...value, showName: e.target.checked })}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 accent-navy"
          />
          <span>
            {showNameLabel}
            <span className="block text-ink-soft">
              {value.showName ? "Cards will say “By <name>”." : "Cards will say “By a student”."}
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

type SolvedFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

// "Solved" tick box — shown only for question papers and assignments.
export function SolvedField({ checked, onChange, disabled }: SolvedFieldProps) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 accent-navy"
      />
      <span>
        <span className="font-semibold">Solved</span> — this PDF includes the answers
        <span className="block text-ink-soft">Leave it unticked if it has questions only (Unsolved).</span>
      </span>
    </label>
  );
}