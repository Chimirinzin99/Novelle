
import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getDashboardStats = async (
  _req: Request,
  res: Response
) => {
  try {
    const [
      studentsResult,
      adminsResult,
      resourcesResult,
      submissionsResult,
      programmesResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "programme_admin"),

      supabase
        .from("resources")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("resource_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),

      supabase
        .from("programmes")
        .select("*", { count: "exact", head: true }),
    ]);

    const results = [
      studentsResult,
      adminsResult,
      resourcesResult,
      submissionsResult,
      programmesResult,
    ];

    const failedResult = results.find(
      (result) => result.error
    );

    if (failedResult?.error) {
      console.error(
        "Super Admin dashboard query failed:",
        failedResult.error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard statistics.",
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents: studentsResult.count ?? 0,
        totalProgrammeAdmins: adminsResult.count ?? 0,
        totalResources: resourcesResult.count ?? 0,
        pendingSubmissions: submissionsResult.count ?? 0,
        totalProgrammes: programmesResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Super Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
};
