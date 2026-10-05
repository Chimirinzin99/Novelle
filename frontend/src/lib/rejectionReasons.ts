// Fixed list of rejection reasons. The codes must match
// backend/src/constants/submissions.ts and the database CHECK constraint.
export const REJECTION_REASONS = [
  { code: "wrong_programme_or_module", label: "Wrong programme or module" },
  { code: "duplicate", label: "Duplicate of an existing resource" },
  { code: "poor_quality_scan", label: "Unreadable or poor-quality scan" },
  { code: "incomplete", label: "Incomplete" },
  { code: "not_academic", label: "Not academic material" },
  { code: "copyright_concern", label: "Copyright concern" },
] as const;

export type RejectionReasonCode =
  (typeof REJECTION_REASONS)[number]["code"];

export const rejectionReasonLabel = (code: string | null | undefined) =>
  REJECTION_REASONS.find((reason) => reason.code === code)?.label ??
  code ??
  "";
