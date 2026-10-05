import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { ALLOWED_TYPES } from "./resources.controller";
import {
  REJECTION_REASONS,
  SUBMISSION_STATUSES,
} from "../constants/submissions";

type SubmissionRow = {
  id: number;
  type: string;
  programme_id: number;
  status: string;
};

// Loads a submission and checks the admin may review it.
// Returns the row, or sends the error response and returns null.
const findReviewableSubmission = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<SubmissionRow | null> => {
  const submissionId = Number(req.params.id);

  if (!Number.isInteger(submissionId) || submissionId < 1) {
    res.status(400).json({
      success: false,
      message: "Invalid submission ID.",
    });
    return null;
  }

  const { data: submission, error } = await supabase
    .from("resource_submissions")
    .select("id, type, programme_id, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (error) {
    console.error("Find submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load submission.",
    });
    return null;
  }

  if (!submission) {
    res.status(404).json({
      success: false,
      message: "Submission not found.",
    });
    return null;
  }

  if (
    req.user?.role === "programme_admin" &&
    submission.programme_id !== req.user.programme_id
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot review submissions from another programme.",
    });
    return null;
  }

  if (submission.status !== "pending") {
    res.status(409).json({
      success: false,
      message: `This submission has already been ${submission.status}.`,
    });
    return null;
  }

  return submission;
};

// ------------------------------------
// GET /api/submissions?status=pending
// ------------------------------------

export const getSubmissions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : "pending";

    if (
      !(SUBMISSION_STATUSES as readonly string[]).includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    let query = supabase
      .from("resource_submissions")
      .select(
        `id, title, type, programme_id, module_id, year, semester,
         file_path, status, rejection_reason, reviewed_at, created_at,
         programme:programmes ( name, short_name ),
         submitter:profiles!resource_submissions_submitted_by_fkey ( full_name, email )`
      )
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (req.user?.role === "programme_admin") {
      if (!req.user.programme_id) {
        return res.status(403).json({
          success: false,
          message: "Programme not assigned to this admin.",
        });
      }

      query = query.eq("programme_id", req.user.programme_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get submissions error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch submissions.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      submissions: data,
    });
  } catch (error) {
    console.error("Get submissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ------------------------------------
// POST /api/submissions/:id/approve
// body: { module_id }
// ------------------------------------

const APPROVE_ERRORS: Record<string, [number, string]> = {
  SUBMISSION_NOT_FOUND: [404, "Submission not found."],
  SUBMISSION_NOT_PENDING: [
    409,
    "This submission has already been reviewed.",
  ],
  MODULE_NOT_FOUND: [400, "Module not found or not active."],
  MODULE_WRONG_PROGRAMME: [
    400,
    "That module belongs to a different programme.",
  ],
};

export const approveSubmission = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const moduleId = Number(req.body?.module_id);

    if (!Number.isInteger(moduleId) || moduleId < 1) {
      return res.status(400).json({
        success: false,
        message: "Please choose a module.",
      });
    }

    const submission = await findReviewableSubmission(req, res);

    if (!submission) return;

    if (!ALLOWED_TYPES.includes(submission.type)) {
      return res.status(400).json({
        success: false,
        message: `Submission has an unknown type "${submission.type}".`,
      });
    }

    // One database call: creates the resource and marks the
    // submission approved together, or does neither.
    const { data: resource, error } = await supabase.rpc(
      "approve_submission",
      {
        p_submission_id: submission.id,
        p_module_id: moduleId,
        p_reviewer: req.user!.id,
      }
    );

    if (error) {
      const known = Object.keys(APPROVE_ERRORS).find((code) =>
        error.message.includes(code)
      );

      if (known) {
        const [status, message] = APPROVE_ERRORS[known];
        return res.status(status).json({ success: false, message });
      }

      console.error("Approve submission error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to approve submission.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Submission approved.",
      resource,
    });
  } catch (error) {
    console.error("Approve submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ------------------------------------
// POST /api/submissions/:id/reject
// body: { reason }
// ------------------------------------

export const rejectSubmission = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const reason = req.body?.reason;

    if (
      typeof reason !== "string" ||
      !(REJECTION_REASONS as readonly string[]).includes(reason)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please choose a rejection reason.",
      });
    }

    const submission = await findReviewableSubmission(req, res);

    if (!submission) return;

    // The status filter stops a race with another admin
    // approving the same submission at the same moment.
    const { data, error } = await supabase
      .from("resource_submissions")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id)
      .eq("status", "pending")
      .select("id, status, rejection_reason")
      .maybeSingle();

    if (error) {
      console.error("Reject submission error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to reject submission.",
        error: error.message,
      });
    }

    if (!data) {
      return res.status(409).json({
        success: false,
        message: "This submission has already been reviewed.",
      });
    }

    return res.json({
      success: true,
      message: "Submission rejected.",
      submission: data,
    });
  } catch (error) {
    console.error("Reject submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};
