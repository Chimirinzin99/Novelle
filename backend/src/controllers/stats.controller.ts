import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../middleware/auth";
import { RESOURCE_TYPES } from "../constants/resourceTypes";
import { SUBMISSION_STATUSES } from "../constants/submissions";

// ------------------------------------
// GET /api/stats/overview   (super admin only)
//
// Numbers for the dashboard's "Content" section:
//   - resources per type      (note, question_paper, assignment, video)
//   - submissions per status  (pending, approved, rejected)
//   - resources per programme
//
// Every number is a COUNT done by the database ({ count: "exact", head: true }
// returns only the count, no rows), so this stays fast however many
// resources there are. The backend uses the service-role key, so the browser
// never needs permission to read other people's rows.
// ------------------------------------

type ProgrammeRow = {
  id: number;
  name: string;
  short_name: string;
};

// Asks the database "how many rows match?" and returns just the number.
// `filter` adds the WHERE part, e.g. (q) => q.eq("type", "note").
const countRows = async (
  table: "resources" | "resource_submissions",
  filter: (query: any) => any = (query) => query
): Promise<number> => {
  const { count, error } = await filter(
    supabase.from(table).select("id", { count: "exact", head: true })
  );

  if (error) throw error;
  return count ?? 0;
};

export const getOverviewStats = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { data: programmes, error: programmesError } = await supabase
      .from("programmes")
      .select("id, name, short_name")
      .order("name", { ascending: true });

    if (programmesError) throw programmesError;
    const programmeList: ProgrammeRow[] = programmes ?? [];

    // Run all the counts at the same time instead of one after another.
    const [typeCounts, statusCounts, programmeCounts]: number[][] =
      await Promise.all([
        Promise.all(
          RESOURCE_TYPES.map((type) =>
            countRows("resources", (q) => q.eq("type", type))
          )
        ),
        Promise.all(
          SUBMISSION_STATUSES.map((status) =>
            countRows("resource_submissions", (q) => q.eq("status", status))
          )
        ),
        Promise.all(
          programmeList.map((programme) =>
            countRows("resources", (q) => q.eq("programme_id", programme.id))
          )
        ),
      ]);

    // Turn the lists of numbers back into labelled objects, e.g.
    // { note: 12, question_paper: 5, assignment: 3, video: 2 }
    const resourcesByType = Object.fromEntries(
      RESOURCE_TYPES.map((type, i) => [type, typeCounts[i]])
    );
    const submissionsByStatus = Object.fromEntries(
      SUBMISSION_STATUSES.map((status, i) => [status, statusCounts[i]])
    );
    const resourcesByProgramme = programmeList.map((programme, i) => ({
      programme_id: programme.id,
      name: programme.name,
      short_name: programme.short_name,
      resources: programmeCounts[i],
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalResources: typeCounts.reduce((sum, n) => sum + n, 0),
        resourcesByType,
        submissionsByStatus,
        resourcesByProgramme,
      },
    });
  } catch (error) {
    console.error("Overview stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load statistics.",
    });
  }
};