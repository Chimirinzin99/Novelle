import { Router } from "express";

import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { getOverviewStats } from "../controllers/stats.controller";

const router = Router();

// Dashboard statistics are super-admin only.
router.use(authenticateUser, requireRole("super_admin"));

// GET /api/stats/overview
router.get("/overview", getOverviewStats);

export default router;