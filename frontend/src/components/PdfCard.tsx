// One card for a PDF resource (note, question paper, assignment) — Part 12.
// Used by /home, the programme category pages, /search and /liked, so every
// PDF looks the same everywhere. Like LikeButton, it only DRAWS: the page
// passes the data and what to do on View / Download / Like.
// Part 13d: optional author credit ("By …" line) and, for question papers and
// assignments, a Solved / Unsolved tag next to the type badge.
// Part 21 ("make Novelle look like Novelle"): the type is a folder tab on top
// of the card, the card has a firm border and small corners (no shadow, no
// lift on hover — the border turns navy instead), one "Open" button plus a
// "Download PDF" link, a star instead of a heart, and Solved/Unsolved as a
// tick/circle + word.

import TypeTab from "@/components/TypeTab";
import LikeButton from "@/components/LikeButton";
import StatusMark from "@/components/StatusMark";
import { authorCredit, isSolvableType } from "@/lib/author";

type PdfCardProps = {
  title: string;
  type: string; // "note" | "question_paper" | "assignment"
  moduleCode?: string | null; // Part 25
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

// Button classes shared with VideoCard (and the admin review page).
export const primaryButton =
  "flex h-11 items-center justify-center rounded-md bg-navy px-6 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";
export const secondaryButton =
  "flex h-11 items-center justify-center rounded-md border-[1.5px] border-navy bg-white px-5 text-[15px] font-bold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2";
// The plain text link next to the main button ("Download PDF").
export const textLinkButton =
  "flex h-11 items-center whitespace-nowrap rounded-md px-1 text-[15px] font-semibold text-navy underline underline-offset-[3px] outline-none transition hover:text-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40";

// The card frame: tab on top, then the bordered box (shared with VideoCard
// and CardSkeleton so all three keep the same shape).
export const cardFrame =
  "flex flex-1 flex-col rounded-b-md rounded-tr-md border-[1.5px] border-card-line bg-white transition-colors hover:border-navy focus-within:border-navy";

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
    .join(", ");
}

// Part 21: the module and the year/semester on two short lines with small
// icons (book, calendar) instead of "Module · Year 1 · Sem 1" — the middle
// dots were a common template habit. Shared with VideoCard.
export function ResourceMeta({
  moduleCode,
  moduleName,
  year,
  semester,
}: {
  moduleCode?: string | null; // Part 25: shown before the name, e.g. "MAT205, Statistics…"
  moduleName?: string | null;
  year?: number | null;
  semester?: number | null;
}) {
  const when = [year ? `Year ${year}` : null, semester ? `Semester ${semester}` : null]
    .filter(Boolean)
    .join(", ");
  const icon = "h-[15px] w-[15px] shrink-0";
  return (
    <div className="space-y-0.5 text-sm text-ink-soft">
      {moduleName !== undefined && (
        <p className="flex items-start gap-1.5">
          <svg viewBox="0 0 24 24" className={`${icon} mt-[3px]`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
            <path d="M4 21V5" />
          </svg>
          <span>
            {moduleCode && moduleName && <span className="font-semibold text-ink-nav">{moduleCode}, </span>}
            {moduleName || "Unknown module"}
          </span>
        </p>
      )}
      {when && (
        <p className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          {when}
        </p>
      )}
    </div>
  );
}

export default function PdfCard({
  title,
  type,
  moduleCode,
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
  // Question papers and assignments show Solved / Unsolved; notes show nothing.
  const tag = isSolvableType(type) ? (isSolved ? "solved" : "unsolved") : null;

  return (
    <div className="flex min-w-0 flex-col">
      <TypeTab type={type} />
      {/* <article>: each card is a self-contained item (helps screen readers). */}
      <article className={`${cardFrame} gap-3 px-5 pb-3.5 pt-[18px]`}>
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-ink">{title}</h3>
          {tag && <StatusMark kind={tag} />}
        </div>

        <div>
          <ResourceMeta moduleCode={moduleCode} moduleName={moduleName} year={year} semester={semester} />
          {credit && <p className="mt-1.5 text-sm font-semibold text-ink-nav">{credit}</p>}
        </div>

        {extra}

        {/* mt-auto pushes the buttons to the bottom so cards in a row line up */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={onView} className={primaryButton}>
            Open
          </button>
          <button type="button" onClick={onDownload} className={textLinkButton}>
            Download PDF
          </button>
          {onLike && !footer && (
            <LikeButton liked={!!liked} count={likes} label={title} onClick={onLike} />
          )}
          {footer && <div className="ml-auto flex shrink-0 items-center gap-2">{footer}</div>}
        </div>
      </article>
    </div>
  );
}
