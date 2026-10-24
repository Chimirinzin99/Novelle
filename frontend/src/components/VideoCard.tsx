// One card for a YouTube video resource — Part 12.
// Used by /home, the programme videos page, /search and /liked.
// Only draws; the page passes the data and the like handler.

import TypeBadge from "@/components/TypeBadge";
import LikeButton from "@/components/LikeButton";
import { primaryButton, resourceDetails } from "@/components/PdfCard";
import { youTubeThumbnail, youTubeWatchUrl } from "@/lib/youtube";

type VideoCardProps = {
  title: string;
  videoId: string; // 11-character YouTube ID (resources.video_id)
  moduleName?: string | null;
  year?: number | null;
  semester?: number | null;
  extra?: React.ReactNode;
  // Optional row under the buttons (e.g. likes + Edit/Delete on the admin
  // All resources page).
  footer?: React.ReactNode;
  // Like is optional: leave onLike out to hide the button (e.g. /search).
  liked?: boolean;
  likes?: number;
  onLike?: () => void;
};

export default function VideoCard({
  title,
  videoId,
  moduleName,
  year,
  semester,
  extra,
  footer,
  liked,
  likes,
  onLike,
}: VideoCardProps) {
  const watchUrl = youTubeWatchUrl(videoId);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Thumbnail opens the video on YouTube in a new tab.
          noopener noreferrer: the new tab can't control this page. */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
        aria-label={`Watch ${title} on YouTube`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={youTubeThumbnail(videoId)}
          alt=""
          loading="lazy"
          className="aspect-video w-full bg-sky-wash object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-navy/0 transition group-hover:bg-navy/20">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/85 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
            </svg>
          </span>
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{title}</h3>
          <TypeBadge type="video" />
        </div>

        <p className="text-sm text-ink-soft">
          {resourceDetails(moduleName, year, semester)}
        </p>

        {extra}

        <div className="mt-auto flex gap-2 pt-1">
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className={primaryButton}>
            Watch
          </a>
          {onLike && (
          <LikeButton liked={!!liked} count={likes} label={title} onClick={onLike} />
          )}
        </div>

        {footer && <div className="flex items-center justify-between gap-2 border-t border-line pt-3">{footer}</div>}
      </div>
    </article>
  );
}