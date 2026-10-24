// The heart + count button on every resource card (Part 12).
// Liked = star-gold style from the design; not liked = plain outline.
// The page keeps the like state and does the database work; this component
// only draws the button and calls onClick.
//
// Usage: <LikeButton liked={isFavourite} count={likes} label={title}
//          onClick={() => handleFavourite(id)} />
// count is optional: /liked has no counts, so it shows just the heart.

type LikeButtonProps = {
  liked: boolean;
  count?: number;
  label: string; // what is being liked, read out by screen readers
  onClick: () => void;
};

export default function LikeButton({ liked, count, label, onClick }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={liked ? "Unlike" : "Like"}
      aria-label={`${liked ? "Unlike" : "Like"} ${label}${
        count === undefined ? "" : `; ${count} ${count === 1 ? "like" : "likes"}`
      }`}
      aria-pressed={liked}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] px-3 text-[15px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-navy/40 ${
        liked
          ? "border-gold bg-gold-tint text-gold-ink"
          : "border-sky-line bg-white text-ink-soft hover:border-gold hover:text-gold-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"
          className={liked ? "fill-gold stroke-[#B87710]" : "fill-none stroke-current"}
          strokeWidth={liked ? 1.2 : 2}
          strokeLinejoin="round"
        />
      </svg>
      {count}
    </button>
  );
}