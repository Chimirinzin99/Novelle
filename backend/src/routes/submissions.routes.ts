import { Router } from "express";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";

import {
  getSubmissions,
  approveSubmission,
  rejectSubmission,
} from "../controllers/submissions.controller";

const router = Router();

// All submission review routes are admin-only.
router.use(
  authenticateUser,
  requireRole("programme_admin", "super_admin")
);

// List submissions (default: pending)
router.get("/", getSubmissions);

// Approve: creates the resource and marks the submission approved
router.post("/:id/approve", approveSubmission);

// Reject with one of the fixed reasons
router.post("/:id/reject", rejectSubmission);

export default router;
