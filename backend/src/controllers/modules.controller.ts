import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";

// ------------------------------------
// Get modules
// ------------------------------------

export const getModules = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const programmeId = req.user?.programme_id;
    const role = req.user?.role;

    let query = supabase
      .from("modules")
      .select("*")
      .order("year", { ascending: true })
      .order("semester", { ascending: true });

    // Programme admin can only see their own programme
    if (role === "programme_admin") {
      if (!programmeId) {
        return res.status(403).json({
          success: false,
          message: "Programme not assigned to this admin.",
        });
      }

      query = query.eq("programme_id", programmeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch modules.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      modules: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ------------------------------------
// Create module
// ------------------------------------

export const createModule = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const programmeId = req.user?.programme_id;
    const role = req.user?.role;

    const {
      programme_id,
      module_code,
      module_name,
      year,
      semester,
    } = req.body;

    // Check required fields
    if (
      !module_code ||
      !module_name ||
      !year ||
      !semester
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Module code, name, year and semester are required.",
      });
    }

    // Programme admin must have a programme
    if (role === "programme_admin" && !programmeId) {
      return res.status(403).json({
        success: false,
        message: "Programme not assigned to this admin.",
      });
    }

    let finalProgrammeId = programme_id;

    // Programme admin can only create
    // modules for their own programme
    if (role === "programme_admin") {
      finalProgrammeId = programmeId;
    }

    // Super admin must provide a programme
    if (!finalProgrammeId) {
      return res.status(400).json({
        success: false,
        message: "Programme is required.",
      });
    }

    const { data, error } = await supabase
      .from("modules")
      .insert({
        programme_id: finalProgrammeId,
        module_code,
        module_name,
        year,
        semester,
      })
      .select()
      .single();

    if (error) {
      console.error("Create module error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create module.",
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Module created successfully.",
      module: data,
    });
  } catch (error) {
    console.error("Create module error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ------------------------------------
// Update module
// ------------------------------------

export const updateModule = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const moduleId = Number(req.params.id);
    const programmeId = req.user?.programme_id;
    const role = req.user?.role;

    const {
      module_code,
      module_name,
      year,
      semester,
    } = req.body;

    // Validate module ID
    if (Number.isNaN(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    // Validate required fields
    if (
      !module_code ||
      !module_name ||
      !year ||
      !semester
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Module code, name, year and semester are required.",
      });
    }

    // Programme admin must have a programme
    if (role === "programme_admin" && !programmeId) {
      return res.status(403).json({
        success: false,
        message: "Programme not assigned to this admin.",
      });
    }

    // Find the module first
    const {
      data: existingModule,
      error: findError,
    } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (findError || !existingModule) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    // Programme admin can only edit
    // modules belonging to their own programme
    if (
      role === "programme_admin" &&
      existingModule.programme_id !== programmeId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot edit a module from another programme.",
      });
    }

    // Update module
    const { data, error } = await supabase
      .from("modules")
      .update({
        module_code,
        module_name,
        year,
        semester,
      })
      .eq("id", moduleId)
      .select()
      .single();

    if (error) {
      console.error("Update module error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update module.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Module updated successfully.",
      module: data,
    });
  } catch (error) {
    console.error("Update module error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ------------------------------------
// Deactivate module
// ------------------------------------

export const deactivateModule = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const moduleId = Number(req.params.id);
    const programmeId = req.user?.programme_id;
    const role = req.user?.role;

    // Validate module ID
    if (Number.isNaN(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    // Programme admin must have a programme
    if (role === "programme_admin" && !programmeId) {
      return res.status(403).json({
        success: false,
        message: "Programme not assigned to this admin.",
      });
    }

    // Find the module first
    const {
      data: existingModule,
      error: findError,
    } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (findError || !existingModule) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    // Programme admin can only deactivate
    // modules belonging to their own programme
    if (
      role === "programme_admin" &&
      existingModule.programme_id !== programmeId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot deactivate a module from another programme.",
      });
    }

    // Deactivate module
    const { data, error } = await supabase
      .from("modules")
      .update({
        active: false,
      })
      .eq("id", moduleId)
      .select()
      .single();

    if (error) {
      console.error("Deactivate module error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to deactivate module.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Module deactivated successfully.",
      module: data,
    });
  } catch (error) {
    console.error("Deactivate module error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};
// ------------------------------------
// Activate module
// ------------------------------------

export const activateModule = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const moduleId = Number(req.params.id);
    const programmeId = req.user?.programme_id;
    const role = req.user?.role;

    if (Number.isNaN(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    if (role === "programme_admin" && !programmeId) {
      return res.status(403).json({
        success: false,
        message: "Programme not assigned to this admin.",
      });
    }

    const {
      data: existingModule,
      error: findError,
    } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (findError || !existingModule) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    if (
      role === "programme_admin" &&
      existingModule.programme_id !== programmeId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot activate a module from another programme.",
      });
    }

    const { data, error } = await supabase
      .from("modules")
      .update({
        active: true,
      })
      .eq("id", moduleId)
      .select()
      .single();

    if (error) {
      console.error("Activate module error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to activate module.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Module activated successfully.",
      module: data,
    });
  } catch (error) {
    console.error("Activate module error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};