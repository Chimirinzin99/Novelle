// components/CardSkeleton.tsx — Part 20 (5 Nov 2026).
//
// Grey placeholder cards shown while a list loads. They take the same space
// as the real cards (<PdfCard />), so when the data arrives nothing below
// jumps down. Lighthouse measured /home's "layout shift" at 0.36 (bad) when
// each section showed a one-line "Loading…" that then grew into a grid.
// aria-hidden: screen readers get the real "Loading…" text instead.

const SKELETON_GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3";

export default function CardSkeleton({ count, label }: { count: number; label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className={SKELETON_GRID} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          // Same padding, border and gaps as PdfCard; min-h ≈ a card with a
          // credit line (title, details, "By …", buttons).
          <div
            key={index}
            className="flex min-h-[14.25rem] animate-pulse flex-col gap-3.5 rounded-2xl border border-line bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-2/3 rounded bg-sky-wash" />
              <div className="h-5 w-14 rounded-full bg-sky-wash" />
            </div>
            <div className="h-4 w-3/4 rounded bg-sky-wash" />
            <div className="h-4 w-1/3 rounded bg-sky-wash" />
            <div className="mt-auto flex gap-2">
              <div className="h-11 flex-1 rounded-xl bg-sky-wash" />
              <div className="h-11 flex-1 rounded-xl bg-sky-wash" />
              <div className="h-11 w-14 rounded-xl bg-sky-wash" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
