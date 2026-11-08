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
          // Part 21: same shape as the new PdfCard — a tab on top, then the
          // bordered box; min-h ≈ a card with a credit line.
          <div key={index} className="flex animate-pulse flex-col">
            <div className="flex">
              <div className="h-[25px] w-24 rounded-t-lg bg-sky-wash" />
            </div>
            <div className="flex min-h-[12.5rem] flex-col gap-3 rounded-b-md rounded-tr-md border-[1.5px] border-card-line bg-white px-5 pb-3.5 pt-[18px]">
              <div className="h-5 w-3/4 rounded bg-sky-wash" />
              <div className="h-4 w-11/12 rounded bg-sky-wash" />
              <div className="h-4 w-1/2 rounded bg-sky-wash" />
              <div className="mt-auto flex items-center gap-4">
                <div className="h-11 w-24 rounded-md bg-sky-wash" />
                <div className="h-4 w-24 rounded bg-sky-wash" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
