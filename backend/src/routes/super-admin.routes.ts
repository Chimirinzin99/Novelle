
import { Router } from "express";
import { authenticateUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { getDashboardStats } from "../controllers/super-admin.controller";

const router = Router();

// All Super Admin routes require authentication
router.use(authenticateUser);

// Only Super Admins can access these routes
router.use(requireRole("super_admin"));

// GET /api/super-admin/dashboard
router.get("/dashboard", getDashboardStats);

export default router;

