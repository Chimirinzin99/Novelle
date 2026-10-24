import Link from "next/link";

// The top of an inner page (Part 12): optional "← Back" link, a small
// uppercase label above the title (e.g. the programme name), the title,
// a description, and an optional item on the right (e.g. "8 notes").
// Shared by the programme category pages, videos, liked, and later others,
// so every page header looks the same.

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string; // small uppercase line above the title
  backHref?: string;
  backLabel?: string; // e.g. "Back to programme"
  aside?: React.ReactNode; // shown on the right on wide screens
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = "Back",
  aside,
}: PageHeaderProps) {
  return (
    <header className="mb-7">
      {backHref && (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-[15px] font-semibold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-muted-blue">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">{title}</h1>
          {description && <p className="text-base text-ink-soft">{description}</p>}
        </div>

        {aside}
      </div>
    </header>
  );
}

// A small rounded counter for the header's right side ("8 notes").
export function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy">
      {children}
    </span>
  );
}