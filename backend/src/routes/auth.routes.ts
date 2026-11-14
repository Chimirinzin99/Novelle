// routes/auth.routes.ts — Part 13e: login with lockout.
// No authenticateUser on /login: the person is not logged in yet.
// Part 24: PATCH /me/name lets any logged-in, active user fix their own name.

import { Router } from "express";
import { login, updateMyName } from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth"; // Part 24
import { requireRole } from "../middleware/role"; // Part 24
import { ROLES } from "../constants/roles"; // Part 24

const router = Router();

// POST /api/auth/login  { email, password }
router.post("/login", login);

// PATCH /api/auth/me/name  { full_name }  (Part 24)
// requireRole(...ROLES) = any role, but it also blocks deactivated accounts.
router.patch("/me/name", authenticateUser, requireRole(...ROLES), updateMyName);

export default router;