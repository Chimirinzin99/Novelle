// Part 23: the button under a list that shows the next 24 cards.
// Draws nothing when every card is already shown.
//
//   <LoadMoreButton remaining={page.remaining} onClick={page.loadMore} />

import { PAGE_SIZE } from "@/lib/useLoadMore";

type LoadMoreButtonProps = {
  remaining: number;
  onClick: () => void;
};

export default function LoadMoreButton({ remaining, onClick }: LoadMoreButtonProps) {
  if (remaining <= 0) return null;

  const next = Math.min(remaining, PAGE_SIZE);

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-11 items-center rounded-md border-[1.5px] border-navy bg-white px-6 text-[15px] font-bold text-navy outline-none transition hover:bg-navy hover:text-white focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
      >
        Load {next} more
      </button>
      <p className="text-sm text-ink-soft">{remaining} more not shown yet</p>
    </div>
  );
}
