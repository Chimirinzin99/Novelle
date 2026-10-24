// The box shown when a list is empty, still loading, or has nothing to
// match (Part 12). One component so every page says it the same way.
//
//   <EmptyState title="No notes found" text="Try other filters."
//     actionLabel="Clear filters" onAction={clearFilters} />
//   <EmptyState title="Loading notes…" />   (no text, no button)

type EmptyStateProps = {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    // role="status": screen readers announce the message when it appears.
    <div
      role="status"
      className="rounded-2xl border border-dashed border-sky-line bg-white px-6 py-12 text-center"
    >
      <p className="font-display text-lg font-bold text-navy">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{text}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-11 rounded-[10px] bg-navy px-5 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}