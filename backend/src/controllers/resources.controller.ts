import { Response } from "express";
import crypto from "crypto";

import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../middleware/auth";

const BUCKET_NAME = "resources";

import { isResourceType } from "../constants/resourceTypes";
import { parseYouTubeId } from "../utils/youtube";

export const getResources = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    let query = supabase
      .from("resources")
      .select(
        "id, topic, type, module_name, programme_id, year, semester, file_path, video_id, uploaded_by, created_at"
      )
      .order("created_at", { ascending: false });

    if (req.user.role === "programme_admin") {
      if (!req.user.programme_id) {
        return res.status(403).json({
          success: false,
          message: "Programme not assigned.",
        });
      }

      query = query.eq("programme_id", req.user.programme_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get resources error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch notes.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      resources: data,
    });
  } catch (error) {
    console.error("Get resources error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

export const uploadResourceFile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { topic, type, module_id } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: "Topic is required.",
      });
    }

    if (!isResourceType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type.",
      });
    }

    // Videos are a YouTube link (no file); every other type is a PDF.
    const isVideo = type === "video";
    let videoId: string | null = null;

    if (isVideo) {
      videoId = parseYouTubeId(req.body.video_url);

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid YouTube video link.",
        });
      }
    } else {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF file.",
        });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are allowed.",
        });
      }
    }

    let programmeId = req.user.programme_id;

    if (req.user.role === "programme_admin" && !programmeId) {
      return res.status(403).json({
        success: false,
        message: "Programme not assigned.",
      });
    }

    let moduleId: number | null = null;
    let moduleName: string;
    let yearNumber: number;
    let semesterNumber: number;

    if (module_id) {
      // Module picked from a dropdown (/admin/resources):
      // name, year, semester and programme all come from the module.
      const { data: module, error: moduleError } = await supabase
        .from("modules")
        .select("id, programme_id, module_name, year, semester, active")
        .eq("id", Number(module_id))
        .maybeSingle();

      if (moduleError || !module || !module.active) {
        return res.status(400).json({
          success: false,
          message: "Module not found or not active.",
        });
      }

      if (
        req.user.role === "programme_admin" &&
        module.programme_id !== programmeId
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot upload to another programme's module.",
        });
      }

      moduleId = module.id;
      moduleName = module.module_name;
      yearNumber = module.year;
      semesterNumber = module.semester;
      programmeId = module.programme_id;
    } else {
      // Module name typed in (/admin/notes).
      const { module_name, year, semester } = req.body;

      if (!module_name || !module_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Module name is required.",
        });
      }

      yearNumber = Number(year);
      semesterNumber = Number(semester);

      if (!Number.isInteger(yearNumber) || yearNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid year.",
        });
      }

      if (
        !Number.isInteger(semesterNumber) ||
        semesterNumber < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester.",
        });
      }

      moduleName = module_name.trim();

      // Super admin must provide a programme_id.
      if (req.user.role === "super_admin") {
        if (!req.body.programme_id) {
          return res.status(400).json({
            success: false,
            message: "Programme ID is required for super admin uploads.",
          });
        }

        programmeId = Number(req.body.programme_id);
      }
    }

    if (!programmeId) {
      return res.status(400).json({
        success: false,
        message: "Programme is required.",
      });
    }

    // PDFs: upload the file to Storage first. Videos have no file.
    let filePath: string | null = null;

    if (!isVideo && req.file) {
      const safeFileName = req.file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      filePath = `admin/${programmeId}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, req.file.buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);

        return res.status(500).json({
          success: false,
          message: "Failed to upload PDF.",
          error: uploadError.message,
        });
      }
    }

    const { data: resource, error: insertError } = await supabase
      .from("resources")
      .insert({
        topic: topic.trim(),
        type,
        module_id: moduleId,
        module_name: moduleName,
        programme_id: programmeId,
        year: yearNumber,
        semester: semesterNumber,
        file_path: filePath, // null for videos
        video_id: videoId, // null for PDFs
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Resource insert error:", insertError);

      // Remove uploaded file if database insert fails.
      if (filePath) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
      }

      return res.status(500).json({
        success: false,
        message: "Failed to save resource information.",
        error: insertError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: isVideo
        ? "Video added successfully."
        : "Resource uploaded successfully.",
      resource,
    });
  } catch (error) {
    console.error("Upload resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

export const createResource = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      topic,
      type,
      module_name,
      year,
      semester,
    } = req.body;

    if (!topic || !module_name || !type || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    if (!isResourceType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type.",
      });
    }

    // Videos are added through POST /upload (it reads the YouTube link).
    if (type === "video") {
      return res.status(400).json({
        success: false,
        message: "Use the upload endpoint to add a video.",
      });
    }

    const yearNumber = Number(year);
    const semesterNumber = Number(semester);

    let programmeId = req.user.programme_id;

    if (req.user.role === "super_admin") {
      programmeId = Number(req.body.programme_id);
    }

    if (!programmeId) {
      return res.status(400).json({
        success: false,
        message: "Programme is required.",
      });
    }

    const { data, error } = await supabase
      .from("resources")
      .insert({
        topic: topic.trim(),
        type,
        module_name: module_name.trim(),
        programme_id: programmeId,
        year: yearNumber,
        semester: semesterNumber,
        file_path: req.body.file_path || null,
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create resource error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create note.",
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Note created successfully.",
      resource: data,
    });
  } catch (error) {
    console.error("Create resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

export const updateResource = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const resourceId = req.params.id;

    const { data: existing, error: findError } = await supabase
      .from("resources")
      .select("id, programme_id, type")
      .eq("id", resourceId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    if (
      req.user.role === "programme_admin" &&
      existing.programme_id !== req.user.programme_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot modify notes from another programme.",
      });
    }

    const {
      topic,
      type,
      module_name,
      year,
      semester,
    } = req.body;

    const updates: Record<string, unknown> = {};

    if (topic !== undefined) updates.topic = topic.trim();

    if (type !== undefined) {
      if (!isResourceType(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource type.",
        });
      }

      // A video has no PDF and a PDF has no video link, so a resource
      // can't be switched to or from "video" by editing its type.
      if ((type === "video") !== (existing.type === "video")) {
        return res.status(400).json({
          success: false,
          message: "Cannot change a resource to or from Video.",
        });
      }

      updates.type = type;
    }

    if (module_name !== undefined) {
      updates.module_name = module_name.trim();
    }

    if (year !== undefined) {
      updates.year = Number(year);
    }

    if (semester !== undefined) {
      updates.semester = Number(semester);
    }

    const { data, error } = await supabase
      .from("resources")
      .update(updates)
      .eq("id", resourceId)
      .select()
      .single();

    if (error) {
      console.error("Update resource error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update note.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Note updated successfully.",
      resource: data,
    });
  } catch (error) {
    console.error("Update resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

export const deleteResource = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const resourceId = req.params.id;

    const { data: resource, error: findError } = await supabase
      .from("resources")
      .select("id, programme_id, file_path")
      .eq("id", resourceId)
      .single();

    if (findError || !resource) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    if (
      req.user.role === "programme_admin" &&
      resource.programme_id !== req.user.programme_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete notes from another programme.",
      });
    }

    if (resource.file_path) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([resource.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    const { error: deleteError } = await supabase
      .from("resources")
      .delete()
      .eq("id", resourceId);

    if (deleteError) {
      console.error("Delete resource error:", deleteError);

      return res.status(500).json({
        success: false,
        message: "Failed to delete note.",
        error: deleteError.message,
      });
    }

    return res.json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    console.error("Delete resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};