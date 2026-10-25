// routes/auth.routes.ts — Part 13e: login with lockout.
// No authenticateUser here: the person is not logged in yet.

import { Router } from "express";
import { login } from "../controllers/auth.controller";

const router = Router();

// POST /api/auth/login  { email, password }
router.post("/login", login);

export default router;