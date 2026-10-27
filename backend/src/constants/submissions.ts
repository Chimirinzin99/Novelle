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

export const SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
