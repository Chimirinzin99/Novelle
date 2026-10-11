import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { isRole } from "../constants/roles";

// How long a deactivated account is banned in Supabase Auth.
// 876000h is about 100 years, i.e. "until reactivated".
const BAN_FOREVER = "876000h";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TargetUser = {
  id: string;
  full_name: string;
  role: string;
  programme_id: number | null;
  is_active: boolean;
};

// Loads the user named in the URL (:id) and checks it isn't the caller.
// Returns the row, or sends the error response and returns null.
// Blocking changes to your own account also means the last super admin
// can never be removed: whoever is acting is a super admin who stays one.
const findTargetUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<TargetUser | null> => {
  const userId = String(req.params.id);

  if (!UUID_PATTERN.test(userId)) {
    res.status(400).json({ success: false, message: "Invalid user ID." });
    return null;
  }

  if (userId === req.user?.id) {
    res.status(400).json({
      success: false,
      message: "You cannot change your own account.",
    });
    return null;
  }

  const { data: user, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, programme_id, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Find user error:", error);
    res.status(500).json({ success: false, message: "Failed to load user." });
    return null;
  }

  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return null;
  }

  return user;
};

// ------------------------------------
// GET /api/users
// Every user, with programme name. Filtering/search happens in the page.
// ------------------------------------

export const getUsers = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `id, full_name, email, role, programme_id, is_active, created_at,
         programme:programmes ( name, short_name )`
      )
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Get users error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users.",
        error: error.message,
      });
    }

    return res.json({ success: true, users: data });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ------------------------------------
// PATCH /api/users/:id/role
// body: { role, programme_id }
//   - student / programme_admin: programme_id required
//   - super_admin: programme_id ignored (always cleared)
// ------------------------------------

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const role = req.body?.role;

    if (!isRole(role)) {
      return res.status(400).json({
        success: false,
        message: "Please choose a valid role.",
      });
    }

    let programmeId: number | null = null;

    if (role !== "super_admin") {
      programmeId = Number(req.body?.programme_id);

      if (!Number.isInteger(programmeId) || programmeId < 1) {
        return res.status(400).json({
          success: false,
          message: "Please choose a programme.",
        });
      }

      const { data: programme, error: programmeError } = await supabase
        .from("programmes")
        .select("id")
        .eq("id", programmeId)
        .maybeSingle();

      if (programmeError) {
        console.error("Find programme error:", programmeError);
        return res.status(500).json({
          success: false,
          message: "Failed to check programme.",
        });
      }

      if (!programme) {
        return res.status(400).json({
          success: false,
          message: "Programme not found.",
        });
      }
    }

    const target = await findTargetUser(req, res);

    if (!target) return;

    if (target.role === role && target.programme_id === programmeId) {
      return res.status(409).json({
        success: false,
        message: `${target.full_name} already has this role and programme.`,
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role, programme_id: programmeId })
      .eq("id", target.id)
      .select("id, full_name, role, programme_id, is_active")
      .single();

    if (error) {
      console.error("Update role error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update role.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: `${target.full_name}'s role updated.`,
      user: data,
    });
  } catch (error) {
    console.error("Update role error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ------------------------------------
// PATCH /api/users/:id/deactivate  and  /api/users/:id/activate
// Two places change together:
//   1. profiles.is_active  (what the app and the admin pages read)
//   2. a Supabase Auth ban (what actually stops the person logging in)
// ------------------------------------

const setUserActive = async (
  req: AuthenticatedRequest,
  res: Response,
  active: boolean
) => {
  try {
    const target = await findTargetUser(req, res);

    if (!target) return;

    if (target.is_active === active) {
      return res.status(409).json({
        success: false,
        message: `${target.full_name} is already ${
          active ? "active" : "deactivated"
        }.`,
      });
    }

    // 1. Profile flag
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_active: active })
      .eq("id", target.id);

    if (profileError) {
      console.error("Set active (profile) error:", profileError);
      return res.status(500).json({
        success: false,
        message: "Failed to update account.",
        error: profileError.message,
      });
    }

    // 2. Login ban ("none" lifts it)
    const { error: authError } = await supabase.auth.admin.updateUserById(
      target.id,
      { ban_duration: active ? "none" : BAN_FOREVER }
    );

    if (authError) {
      console.error("Set active (auth) error:", authError);

      // Undo step 1 so the two places don't disagree.
      await supabase
        .from("profiles")
        .update({ is_active: target.is_active })
        .eq("id", target.id);

      return res.status(500).json({
        success: false,
        message: "Failed to update login access. Nothing was changed.",
        error: authError.message,
      });
    }

    return res.json({
      success: true,
      message: `${target.full_name} ${active ? "reactivated" : "deactivated"}.`,
    });
  } catch (error) {
    console.error("Set active error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

export const deactivateUser = (req: AuthenticatedRequest, res: Response) =>
  setUserActive(req, res, false);

export const activateUser = (req: AuthenticatedRequest, res: Response) =>
  setUserActive(req, res, true);