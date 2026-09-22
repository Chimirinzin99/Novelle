import { Router } from "express";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";

import {
  getModules,
  createModule,
  updateModule,
  deactivateModule,
  activateModule,
} from "../controllers/modules.controller";

const router = Router();

// ------------------------------------
// Get modules
// ------------------------------------

router.get(
  "/",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  getModules
);

// ------------------------------------
// Create module
// ------------------------------------

router.post(
  "/",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  createModule
);

// ------------------------------------
// Update module
// ------------------------------------

router.put(
  "/:id",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  updateModule
);

// ------------------------------------
// Deactivate module
// ------------------------------------

router.patch(
  "/:id/deactivate",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  deactivateModule
);

// ------------------------------------
// Activate module
// ------------------------------------

router.patch(
  "/:id/activate",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  activateModule
);

export default router;