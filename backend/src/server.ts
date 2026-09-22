import "dotenv/config";
import express from "express";
import cors from "cors";

import { supabase } from "./config/supabase";
import {
  authenticateUser,
  AuthenticatedRequest,
} from "./middleware/auth";
import { requireRole } from "./middleware/role";
import modulesRoutes from "./routes/modules.routes";
import resourcesRoutes from "./routes/resources.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Modules API
app.use("/api/modules", modulesRoutes);

// Resources API
app.use("/api/resources", resourcesRoutes);

const PORT = 5000;

// ------------------------------------
// Basic backend test
// ------------------------------------

app.get("/", (_req, res) => {
  res.json({
    message: "Novelle backend is running!",
  });
});

// ------------------------------------
// Test Supabase connection
// ------------------------------------

app.get("/api/test-supabase", async (_req, res) => {
  const { data, error } = await supabase
    .from("programmes")
    .select("id, name, short_name")
    .limit(10);

  if (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Supabase connection failed",
      error: error.message,
    });
  }

  return res.json({
    success: true,
    message: "Backend connected to Supabase!",
    programmes: data,
  });
});

// ------------------------------------
// Test authentication
// ------------------------------------

app.get(
  "/api/test-auth",
  authenticateUser,
  (req: AuthenticatedRequest, res) => {
    return res.json({
      success: true,
      message: "Authentication successful!",
      user: req.user,
    });
  }
);

// ------------------------------------
// Test user profile
// ------------------------------------

app.get(
  "/api/test-profile",
  authenticateUser,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, programme_id"
        )
        .eq("id", req.user.id)
        .single();

      if (error) {
        console.error("Profile error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch profile.",
          error: error.message,
        });
      }

      return res.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error("Profile test error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error.",
      });
    }
  }
);

// ------------------------------------
// Test admin authorization
// ------------------------------------

app.get(
  "/api/test-admin",
  authenticateUser,
  requireRole("programme_admin", "super_admin"),
  (req: AuthenticatedRequest, res) => {
    return res.json({
      success: true,
      message: "Admin authorization successful!",
      user: req.user,
    });
  }
);

// ------------------------------------
// Start backend server
// ------------------------------------

app.listen(PORT, () => {
  console.log(
    `Novelle backend running on http://localhost:${PORT}`
  );
});