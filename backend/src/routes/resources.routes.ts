import { Router } from "express";
import multer from "multer";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { MAX_UPLOAD_BYTES } from "../constants/uploads";

import {
  getResources,
  updateResource,
  deleteResource,
  uploadResourceFile,
} from "../controllers/resources.controller";

const router = Router();

// Store uploaded file temporarily in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES, // Part 14: 4 MB (constants/uploads.ts)
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }

    cb(null, true);
  },
});

// ------------------------------------
// Get resources
// ------------------------------------

router.get(
  "/",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  getResources
);

// ------------------------------------
// Update resource
// ------------------------------------

router.put(
  "/:id",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  updateResource
);

// ------------------------------------
// Delete resource
// ------------------------------------

router.delete(
  "/:id",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  deleteResource
);

// ------------------------------------
// Upload PDF
// ------------------------------------

router.post(
  "/upload",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  upload.single("file"),
  uploadResourceFile
);

export default router;