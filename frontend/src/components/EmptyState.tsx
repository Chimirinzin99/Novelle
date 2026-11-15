// The box shown when a list is empty, still loading, or has nothing to
// match (Part 12). One component so every page says it the same way.
// Part 21: left-aligned, dashed border with small corners, and the button can
// be a link to another page (e.g. "Upload a paper" → /submit-note), so the
// message always says what to do next.
//
//   <EmptyState title="No notes found" text="Try other filters."
//     actionLabel="Clear filters" onAction={clearFilters} />
//   <EmptyState title="No CSF101 papers yet" text="Sat this exam? …"
//     actionLabel="Upload a paper" actionHref="/submit-note" />
//   <EmptyState title="Loading notes…" />   (no text, no button)

import Link from "next/link";

type EmptyStateProps = {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
};

const actionClass =
  "mt-2 inline-flex h-11 items-center rounded-md bg-navy px-5 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";

export default function EmptyState({ title, text, actionLabel, onAction, actionHref }: EmptyStateProps) {
  return (
    // role="status": screen readers announce the message when it appears.
    <div
      role="status"
      className="flex flex-col items-start gap-2.5 rounded-md border-[1.5px] border-dashed border-sky-line bg-white px-7 py-8"
    >
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {text && <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">{text}</p>}

      {actionLabel && actionHref && (
        <Link href={actionHref} className={actionClass}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
