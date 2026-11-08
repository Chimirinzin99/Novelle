// The star + count button on every resource card.
// Part 12 drew a heart; Part 21 changed it to a STAR ("Starred" page), so it
// matches the gold star in the logo. The database part is unchanged: it is
// still the favourites table, and the page still does the work.
//
// Usage: <LikeButton liked={isFavourite} count={likes} label={title}
//          onClick={() => handleFavourite(id)} />
// count is optional: /liked (the Starred page) has no counts.

type LikeButtonProps = {
  liked: boolean;
  count?: number;
  label: string; // what is being starred, read out by screen readers
  onClick: () => void;
};

export default function LikeButton({ liked, count, label, onClick }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={liked ? "Unstar" : "Star"}
      aria-label={`${liked ? "Unstar" : "Star"} ${label}${
        count === undefined ? "" : `; ${count} ${count === 1 ? "star" : "stars"}`
      }`}
      aria-pressed={liked}
      className={`ml-auto flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[15px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-navy/40 ${
        liked ? "text-gold-ink" : "text-ink-soft hover:text-gold-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"
          className={liked ? "fill-gold stroke-gold" : "fill-none stroke-current"}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
      </svg>
      {count}
    </button>
  );
}
