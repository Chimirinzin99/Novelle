// routes/auth.routes.ts — Part 13e: login with lockout.
// No authenticateUser on /login: the person is not logged in yet.
// Part 24: PATCH /me/name lets any logged-in, active user fix their own name.

import { Router } from "express";
import { login, requestAdminAccess, updateMyName } from "../controllers/auth.controller";
import { authenticateUser } from "../middleware/auth"; // Part 24
import { requireRole } from "../middleware/role"; // Part 24
import { ROLES } from "../constants/roles"; // Part 24

const router = Router();

// POST /api/auth/login  { email, password }
router.post("/login", login);

// PATCH /api/auth/me/name  { full_name }  (Part 24)
// requireRole(...ROLES) = any role, but it also blocks deactivated accounts.
router.patch("/me/name", authenticateUser, requireRole(...ROLES), updateMyName);

// POST /api/auth/me/admin-request  { programme_id, note? }  (Part 25)
// Students only (lecturers are students in the DB); the controller also
// checks for a lecturer-style email. Emails the super admins.
router.post("/me/admin-request", authenticateUser, requireRole("student"), requestAdminAccess);

export default router;
