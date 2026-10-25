// server.ts — the Novelle backend (Express).
// Part 13e: adds /api/auth (login with lockout).

import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";

import modulesRoutes from "./routes/modules.routes";
import resourcesRoutes from "./routes/resources.routes";
import submissionsRoutes from "./routes/submissions.routes";
import usersRoutes from "./routes/users.routes";
import statsRoutes from "./routes/stats.routes";
import authRoutes from "./routes/auth.routes";

// ------------------------------------
// Settings from .env (with local defaults)
// ------------------------------------

// Port: hosting services set PORT themselves; locally it stays 5000.
const PORT = Number(process.env.PORT) || 5000;

// Which websites may call this API from the browser (CORS).
// FRONTEND_URL can hold one or more addresses separated by commas,
// e.g. "http://localhost:3000,https://novelle.example.com".
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

// Don't advertise "X-Powered-By: Express" on every reply.
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = not a browser page (curl, server tools): allow.
      // Our own frontend's address: allow. Any other website: refuse.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  })
);
app.use(express.json());

// ------------------------------------
// Routes
// ------------------------------------

// Health check: lets you (or a hosting service) see the server is up.
app.get("/", (_req, res) => {
  res.json({ message: "Novelle backend is running!" });
});

// Modules API
app.use("/api/modules", modulesRoutes);

// Resources API
app.use("/api/resources", resourcesRoutes);

// Submissions API (student upload + admin review)
app.use("/api/submissions", submissionsRoutes);

// Users API (super admin: roles, deactivate/activate)
app.use("/api/users", usersRoutes);

// Stats API (super admin dashboard numbers)
app.use("/api/stats", statsRoutes);

// Auth API (Part 13e: login with lockout after 5 wrong passwords)
app.use("/api/auth", authRoutes);

// Unknown address -> JSON 404 (instead of Express's HTML page).
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});

// ------------------------------------
// Error handler (must be last, and must have 4 parameters)
// ------------------------------------
// Catches errors that routes don't handle themselves, e.g. a non-PDF or a
// too-big file on the admin upload, or broken JSON in a request body.
// Always answers in JSON and never sends the error's stack trace to the browser.

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "PDF file must be 5 MB or smaller."
          : "File upload failed.";
      return res.status(400).json({ success: false, message });
    }

    if (
      error instanceof Error &&
      error.message === "Only PDF files are allowed."
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // express.json() sets type "entity.parse.failed" for broken JSON.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { type?: string }).type === "entity.parse.failed"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON in request." });
    }

    console.error("Unhandled error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
);

// ------------------------------------
// Start backend server
// ------------------------------------

app.listen(PORT, () => {
  console.log(`Novelle backend running on http://localhost:${PORT}`);
  console.log(`Allowed frontend(s): ${ALLOWED_ORIGINS.join(", ")}`);
});