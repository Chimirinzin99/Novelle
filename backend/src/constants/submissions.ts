// constants/submissions.ts — rejection reasons and submission statuses.
// Part 13c: adds REJECTION_REASON_LABELS (used in the "rejected" notification).

// Rejection reasons an admin can pick. Must match the CHECK constraint in
// database/migrations/001_submission_review.sql and the labels in
// frontend/src/lib/rejectionReasons.ts.
export const REJECTION_REASONS = [
  "wrong_programme_or_module",
  "duplicate",
  "poor_quality_scan",
  "incomplete",
  "not_academic",
  "copyright_concern",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

// Same wording as frontend/src/lib/rejectionReasons.ts — keep them alike.
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  wrong_programme_or_module: "Wrong programme or module",
  duplicate: "Duplicate of an existing resource",
  poor_quality_scan: "Unreadable or poor-quality scan",
  incomplete: "Incomplete",
  not_academic: "Not academic material",
  copyright_concern: "Copyright concern",
};

export const SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;