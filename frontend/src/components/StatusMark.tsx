// Part 21: a small icon + word used instead of coloured pills.
//   <StatusMark kind="solved" />     green tick   "Solved"
//   <StatusMark kind="unsolved" />   grey circle  "Unsolved"
//   <StatusMark kind="pending" />    gold clock   "Waiting for review"
//   <StatusMark kind="approved" />   green tick   "Approved"
//   <StatusMark kind="rejected" />   red cross    "Rejected"
// The word is always shown, so the colour is never the only signal.

export type StatusKind = "solved" | "unsolved" | "pending" | "approved" | "rejected";

const MARKS: Record<StatusKind, { text: string; className: string; path: string }> = {
  solved: { text: "Solved", className: "text-green-700", path: "M5 12.5l4.5 4.5L19 7.5" },
  unsolved: { text: "Unsolved", className: "text-ink-soft", path: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z" },
  pending: { text: "Waiting for review", className: "text-gold-ink", path: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM12 7.5V12l3 2" },
  approved: { text: "Approved", className: "text-green-700", path: "M5 12.5l4.5 4.5L19 7.5" },
  rejected: { text: "Rejected", className: "text-red-700", path: "M6.5 6.5l11 11M17.5 6.5l-11 11" },
};

export default function StatusMark({ kind, label }: { kind: StatusKind; label?: string }) {
  const mark = MARKS[kind];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-bold ${mark.className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={kind === "solved" || kind === "approved" || kind === "rejected" ? 3 : 2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={mark.path} />
      </svg>
      {label ?? mark.text}
    </span>
  );
}
