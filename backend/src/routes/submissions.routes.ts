import { Router } from "express";
import multer from "multer";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";

import {
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  uploadStudentSubmission,
} from "../controllers/submissions.controller";

const router = Router();

const studentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
});

// Student uploads are authenticated and limited to 5 MB before reaching Storage.
router.post(
  "/upload",
  authenticateUser,
  requireRole("student"),
  (req, res, next) => {
    studentUpload.single("file")(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: "PDF must be 5 MB or smaller." });
      }
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next();
    });
  },
  uploadStudentSubmission
);

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
