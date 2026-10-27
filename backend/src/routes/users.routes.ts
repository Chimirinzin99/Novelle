import { Router } from "express";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";

import {
  getUsers,
  updateUserRole,
  deactivateUser,
  activateUser,
} from "../controllers/users.controller";

const router = Router();

// All user-management routes are super-admin only.
router.use(authenticateUser, requireRole("super_admin"));

// List every user
router.get("/", getUsers);

// Change role (and programme)
router.patch("/:id/role", updateUserRole);

// Block / unblock the account (profile flag + login ban)
router.patch("/:id/deactivate", deactivateUser);
router.patch("/:id/activate", activateUser);

export default router;