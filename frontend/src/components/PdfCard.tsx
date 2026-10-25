// One card for a PDF resource (note, question paper, assignment) — Part 12.
// Used by /home, the programme category pages, /search and /liked, so every
// PDF looks the same everywhere. Like LikeButton, it only DRAWS: the page
// passes the data and what to do on View / Download / Like.
// Part 13d: optional author credit ("By …" line) and, for question papers and
// assignments, a Solved / Unsolved tag next to the type badge.

import TypeBadge from "@/components/TypeBadge";
import LikeButton from "@/components/LikeButton";
import { authorCredit, isSolvableType, solvedTag } from "@/lib/author";

type PdfCardProps = {
  title: string;
  type: string; // "note" | "question_paper" | "assignment"
  moduleName?: string | null;
  year?: number | null;
  semester?: number | null;
  // Part 13d (all optional): author credit and Solved/Unsolved
  authorType?: string | null;
  authorName?: string | null;
  isSolved?: boolean | null;
  // Optional extra line under the details (e.g. the programme link on /search).
  extra?: React.ReactNode;
  // Optional row under the buttons (e.g. likes + Edit/Delete on the admin
  // All resources page).
  footer?: React.ReactNode;
  onView: () => void;
  onDownload: () => void;
  // Like is optional: leave onLike out to hide the button (e.g. /search).
  liked?: boolean;
  likes?: number;
  onLike?: () => void;
};

// Button classes shared with VideoCard.
export const primaryButton =
  "flex h-11 flex-1 items-center justify-center rounded-[10px] bg-navy px-3 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";
export const secondaryButton =
  "flex h-11 flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-sky-line bg-white px-3 text-[15px] font-semibold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";

// "Website Fundamentals · Year 1 · Sem 1" (skips any part that is missing).
// moduleName undefined = the page has no module to show (left out);
// null or "" = the resource has no module ("Unknown module").
export function resourceDetails(
  moduleName?: string | null,
  year?: number | null,
  semester?: number | null
) {
  return [
    moduleName === undefined ? null : moduleName || "Unknown module",
    year ? `Year ${year}` : null,
    semester ? `Sem ${semester}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function PdfCard({
  title,
  type,
  moduleName,
  year,
  semester,
  authorType,
  authorName,
  isSolved,
  extra,
  footer,
  onView,
  onDownload,
  liked,
  likes,
  onLike,
}: PdfCardProps) {
  const credit = authorCredit(authorType, authorName); // "By …" or null
  const tag = isSolvableType(type) ? solvedTag(isSolved) : null;

  return (
    // <article>: each card is a self-contained item (helps screen readers).
    <article className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{title}</h3>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TypeBadge type={type} />
          {tag && (
            <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tag.className}`}>
              {tag.text}
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-ink-soft">{resourceDetails(moduleName, year, semester)}</p>
        {credit && <p className="mt-1 text-sm font-medium text-ink-nav">{credit}</p>}
      </div>

      {extra}

      {/* mt-auto pushes the buttons to the bottom so cards in a row line up */}
      <div className="mt-auto flex gap-2 pt-1">
        <button type="button" onClick={onView} className={primaryButton}>
          View
        </button>
        <button type="button" onClick={onDownload} className={secondaryButton}>
          Download
        </button>
        {onLike && (
          <LikeButton liked={!!liked} count={likes} label={title} onClick={onLike} />
          )}
      </div>

      {footer && <div className="flex items-center justify-between gap-2 border-t border-line pt-3">{footer}</div>}
    </article>
  );
}