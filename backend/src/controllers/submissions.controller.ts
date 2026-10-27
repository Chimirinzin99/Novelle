// controllers/submissions.controller.ts — student uploads and admin review.
// Feedback (27 Oct): uploads now carry where the resource belongs — year and
// semester (required) and optionally a module (checked: active, the
// student's own programme, same year + semester). GET also returns the
// module's code and name so the review page can show and filter by them.
// Part 13d: uploads take author credit + Solved/Unsolved (utils/author.ts);
// approve lets the admin correct them first; GET returns them.
// Part 13c: each step now also saves a notification for the student
// (utils/notifications.ts): pending on upload, approved, rejected + reason.

import { Response } from "express";
import crypto from "crypto";

import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { isResourceType } from "../constants/resourceTypes";
import {
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  SUBMISSION_STATUSES,
  type RejectionReason,
} from "../constants/submissions";
import { notifyUser, shortTitle } from "../utils/notifications";
import { readAuthor, readBoolean } from "../utils/author";

const RESOURCE_BUCKET = "resources";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Years a programme can have (Architecture is 5 years).
const MIN_YEAR = 1;
const MAX_YEAR = 5;

export const uploadStudentSubmission = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  let uploadedPath: string | null = null;

  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const type = req.body?.type;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!title || title.length > 120) {
      return res.status(400).json({ success: false, message: "Enter a title up to 120 characters." });
    }
    if (type !== "note" && type !== "question_paper" && type !== "assignment") {
      return res.status(400).json({ success: false, message: "Invalid submission type." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a PDF file." });
    }
    if (req.file.size > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ success: false, message: "PDF must be 5 MB or smaller." });
    }
    if (req.file.mimetype !== "application/pdf" || !req.file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ success: false, message: "Only PDF files are allowed." });
    }
    if (!req.user.programme_id) {
      return res.status(400).json({ success: false, message: "Your account has no programme assigned." });
    }

    // Part 13d: who made it ("self" = this student) and Solved/Unsolved
    const author = await readAuthor(req.body, req.user.id);
    if (!author.ok) {
      return res.status(400).json({ success: false, message: author.message });
    }
    // Only question papers and assignments can be "Solved".
    const isSolved = type !== "note" && readBoolean(req.body?.is_solved) === true;

    // Feedback (27 Oct): where it belongs — year + semester required,
    // module optional ("" or missing = "Not sure / not listed").
    const year = Number(req.body?.year);
    const semester = Number(req.body?.semester);
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      return res.status(400).json({ success: false, message: "Please choose the year." });
    }
    if (semester !== 1 && semester !== 2) {
      return res.status(400).json({ success: false, message: "Please choose the semester." });
    }

    let moduleId: number | null = null;
    const rawModule = req.body?.module_id;
    if (rawModule !== undefined && rawModule !== null && rawModule !== "") {
      moduleId = Number(rawModule);
      if (!Number.isInteger(moduleId) || moduleId < 1) {
        return res.status(400).json({ success: false, message: "Invalid module." });
      }

      const { data: module, error: moduleError } = await supabase
        .from("modules")
        .select("id, programme_id, year, semester, active")
        .eq("id", moduleId)
        .maybeSingle();
      if (moduleError) throw moduleError;

      // Same rules a student sees in the dropdown: active, own programme,
      // and the year + semester they chose.
      if (
        !module ||
        !module.active ||
        module.programme_id !== req.user.programme_id ||
        module.year !== year ||
        module.semester !== semester
      ) {
        return res.status(400).json({
          success: false,
          message: "That module isn't available for your programme in this year and semester. Choose another or \"Not sure / not listed\".",
        });
      }
    }

    const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    uploadedPath = `submissions/${req.user.id}/${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(RESOURCE_BUCKET)
      .upload(uploadedPath, req.file.buffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data, error: insertError } = await supabase
      .from("resource_submissions")
      .insert({
        title,
        type,
        programme_id: req.user.programme_id,
        file_path: uploadedPath,
        submitted_by: req.user.id,
        status: "pending",
        author_type: author.fields?.author_type ?? null, // Part 13d
        author_name: author.fields?.author_name ?? null,
        is_solved: isSolved,
        year, // feedback (27 Oct)
        semester,
        module_id: moduleId, // null = "Not sure / not listed"
      })
      .select("id, status")
      .single();

    if (insertError) throw insertError;

    // Part 13c: "pending" notification (was written by the browser before)
    await notifyUser({
      userId: req.user.id,
      kind: "pending",
      submissionId: data.id,
      message: `"${shortTitle(title)}" was submitted and is waiting for admin review.`,
    });

    return res.status(201).json({
      success: true,
      message: "Resource submitted for admin review.",
      submission: data,
    });
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from(RESOURCE_BUCKET).remove([uploadedPath]);
    }
    console.error("Student submission upload error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit resource." });
  }
};

type SubmissionRow = {
  id: number;
  title: string | null; // Part 13c: for the notification text
  type: string;
  programme_id: number;
  status: string;
  submitted_by: string | null; // Part 13c: who to notify (null = deleted account)
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
    .select("id, title, type, programme_id, status, submitted_by")
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
         author_type, author_name, is_solved,
         module:modules ( module_code, module_name ),
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
// Part 13d, optional: author_type, author_name, show_author_name, is_solved
// — the admin's corrections, saved on the submission before approving so
// approve_submission() copies them into the new resource.
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

    if (!isResourceType(submission.type)) {
      return res.status(400).json({
        success: false,
        message: `Submission has an unknown type "${submission.type}".`,
      });
    }

    // Part 13d: admin's corrections to author / Solved (only fields sent).
    // "self" here means the student who submitted it.
    const author = await readAuthor(req.body, submission.submitted_by);
    if (!author.ok) {
      return res.status(400).json({ success: false, message: author.message });
    }
    const solved = readBoolean(req.body?.is_solved);
    const corrections: Record<string, unknown> = { ...(author.fields ?? {}) };
    if (solved !== undefined) {
      corrections.is_solved = submission.type !== "note" && solved;
    }

    if (Object.keys(corrections).length > 0) {
      const { error: correctError } = await supabase
        .from("resource_submissions")
        .update(corrections)
        .eq("id", submission.id)
        .eq("status", "pending");

      if (correctError) {
        console.error("Approve corrections error:", correctError);
        return res.status(500).json({
          success: false,
          message: "Failed to save the author / Solved changes.",
        });
      }
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

    // Part 13c: tell the student
    await notifyUser({
      userId: submission.submitted_by,
      kind: "approved",
      submissionId: submission.id,
      message: `"${shortTitle(submission.title)}" was approved and is now published.`,
    });

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

    // Part 13c: tell the student, with the reason
    await notifyUser({
      userId: submission.submitted_by,
      kind: "rejected",
      submissionId: submission.id,
      message: `"${shortTitle(submission.title)}" was rejected: ${
        REJECTION_REASON_LABELS[reason as RejectionReason]
      }.`,
    });

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