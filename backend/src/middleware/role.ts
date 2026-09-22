import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { supabase } from "../config/supabase";

export const requireRole = (...allowedRoles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, programme_id")
        .eq("id", req.user.id)
        .single();

      if (error || !profile) {
        return res.status(403).json({
          success: false,
          message: "User profile not found.",
        });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      req.user = {
        ...req.user,
        role: profile.role,
        programme_id: profile.programme_id,
      };

      next();
    } catch (error) {
      console.error("Role authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization failed.",
      });
    }
  };
};