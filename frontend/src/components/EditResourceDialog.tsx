"use client";

// The "Edit resource" window (Part 12).
// It used to live inside /admin/resources, but since the 21 Oct redesign that
// page no longer lists resources, so the Edit button could not be reached.
// Now it is its own component, opened from the pencil button on
// /admin/all-resources.
//
// It sends ONLY what changed to PUT /api/resources/:id (Part 7). The backend
// checks the admin's programme, copies name/year/semester from the chosen
// module, and keeps title and topic the same for approved submissions.
// A PDF can't be swapped here (delete it and upload the new one instead), and
// a video stays a video.
// Part 13d: also edits "Who made it?" (author credit) and, for question
// papers and assignments, Solved — again sending only what changed.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { RESOURCE_TYPES } from "@/lib/resourceTypes";
import { parseYouTubeId, youTubeWatchUrl } from "@/lib/youtube";
import {
  authorFormError,
  authorFormFrom,
  authorJson,
  isSolvableType,
  sameAuthor,
  type AuthorForm,
} from "@/lib/author";
import AuthorFields, { SolvedField } from "@/components/AuthorFields";

// The fields of a resource this window needs.
export type EditableResource = {
  id: number;
  title: string | null;
  topic: string | null;
  type: string;
  module_id: number | null;
  module_name: string | null;
  programme_id: number;
  year: number;
  semester: number;
  video_id: string | null;
  author_type: string | null; // Part 13d
  author_name: string | null;
  is_solved: boolean;
};

// A row from GET /api/modules (programme admins only get their own programme's).
type Module = {
  id: number;
  programme_id: number;
  module_code: string;
  module_name: string;
  year: number;
  semester: number;
  active: boolean;
};

type Programme = { id: number; name: string };

type EditResourceDialogProps = {
  resource: EditableResource;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void; // the page reloads the resource and shows "Changes saved."
};

const inputClass =
  "h-11 w-full rounded-[10px] border-[1.5px] border-sky-line bg-white px-3 text-[15px] text-ink outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint disabled:bg-sky-wash disabled:text-ink-soft";
const labelClass = "mb-1.5 block text-sm font-semibold text-ink-nav";

export default function EditResourceDialog({
  resource,
  isSuperAdmin,
  onClose,
  onSaved,
}: EditResourceDialogProps) {
  // What students see as the name: approved submissions use `title`,
  // admin uploads use `topic`.
  const currentName = resource.title || resource.topic || "";

  // The form starts as a copy of the resource's current values.
  const [name, setName] = useState(currentName);
  const [type, setType] = useState(resource.type);
  const [programmeId, setProgrammeId] = useState(String(resource.programme_id));
  const [year, setYear] = useState(String(resource.year));
  const [semester, setSemester] = useState(String(resource.semester));
  // "" = keep the current module.
  const [moduleId, setModuleId] = useState(resource.module_id ? String(resource.module_id) : "");
  const [videoUrl, setVideoUrl] = useState(resource.video_id ? youTubeWatchUrl(resource.video_id) : "");
  // Part 13d: credit + Solved, starting from the saved values
  const initialAuthor = authorFormFrom(resource.author_type, resource.author_name);
  const [author, setAuthor] = useState<AuthorForm>(initialAuthor);
  const [isSolved, setIsSolved] = useState(resource.is_solved === true);

  const [modules, setModules] = useState<Module[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load the module list (and the programme list for super admins) once,
  // when the window opens.
  useEffect(() => {
    async function loadOptions() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      try {
        const response = await callBackend(`${BACKEND_URL}/api/modules`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await readJson(response);
        if (response.ok) setModules(data.modules || []);
        else setError(data.message || "Unable to load modules.");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load modules.");
      }

      if (isSuperAdmin) {
        const { data: programmeList } = await supabase.from("programmes").select("id, name").order("name");
        setProgrammes(programmeList || []);
      }
    }

    void loadOptions();
  }, [isSuperAdmin]);

  // Escape closes the window (the usual keyboard shortcut for dialogs).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Active modules for the chosen year + semester (and programme, for super admins).
  const moduleOptions = modules.filter(
    (m) =>
      m.active &&
      m.year === Number(year) &&
      m.semester === Number(semester) &&
      (!isSuperAdmin || m.programme_id === Number(programmeId))
  );

  // Send only what changed to PUT /api/resources/:id.
  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a title.");
      return;
    }

    const changes: Record<string, string | boolean> = {};

    // The backend calls this field "topic" (it also updates title when there is one).
    if (name.trim() !== currentName) changes.topic = name.trim();
    if (type !== resource.type) changes.type = type;
    if (moduleId && moduleId !== String(resource.module_id)) changes.module_id = moduleId;

    if (resource.video_id) {
      const newVideoId = parseYouTubeId(videoUrl);
      if (!newVideoId) {
        setError("Please enter a valid YouTube video link.");
        return;
      }
      if (newVideoId !== resource.video_id) changes.video_url = videoUrl.trim();
    }

    // Part 13d: author credit (only if changed) and Solved
    if (!sameAuthor(author, initialAuthor)) {
      const authorProblem = authorFormError(author);
      if (authorProblem) {
        setError(authorProblem);
        return;
      }
      Object.assign(changes, authorJson(author));
    }
    if (isSolvableType(type) && isSolved !== (resource.is_solved === true)) {
      changes.is_solved = isSolved;
    }

    if (Object.keys(changes).length === 0) {
      onClose(); // nothing changed: just close
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Your login session has expired. Please sign in again.");
        return;
      }

      const response = await callBackend(`${BACKEND_URL}/api/resources/${resource.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });
      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message || "Failed to save changes.");
        return;
      }

      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to connect to the backend.");
    } finally {
      setSaving(false);
    }
  }

  return (
    // Dark backdrop; clicking it does nothing, so a half-filled form isn't lost.
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-resource-title"
        onSubmit={handleSave}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-resource-title" className="text-xl font-bold text-navy">
              Edit resource
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Currently: {resource.module_name || "Unknown module"} · Year {resource.year} · Sem {resource.semester}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-soft outline-none hover:bg-sky-wash hover:text-navy focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label htmlFor="edit-name" className={labelClass}>
            Title
          </label>
          <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        {/* Type: a video stays a video, a PDF stays a PDF type */}
        <div>
          <label htmlFor="edit-type" className={labelClass}>
            Type
          </label>
          <select
            id="edit-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={resource.type === "video"}
            className={inputClass}
          >
            {RESOURCE_TYPES.filter((t) => (t.code === "video") === (resource.type === "video")).map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Programme (super admins only) */}
        {isSuperAdmin && (
          <div>
            <label htmlFor="edit-programme" className={labelClass}>
              Programme
            </label>
            <select
              id="edit-programme"
              value={programmeId}
              onChange={(e) => {
                setProgrammeId(e.target.value);
                setModuleId("");
              }}
              className={inputClass}
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Year + Semester narrow down the Module list */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-year" className={labelClass}>
              Year
            </label>
            <select
              id="edit-year"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setModuleId("");
              }}
              className={inputClass}
            >
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-semester" className={labelClass}>
              Semester
            </label>
            <select
              id="edit-semester"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setModuleId("");
              }}
              className={inputClass}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
        </div>

        {/* Module: leaving it on "Keep current module" changes nothing */}
        <div>
          <label htmlFor="edit-module" className={labelClass}>
            Module
          </label>
          <select id="edit-module" value={moduleId} onChange={(e) => setModuleId(e.target.value)} className={inputClass}>
            <option value="">Keep current module</option>
            {moduleOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.module_code} - {m.module_name}
              </option>
            ))}
          </select>
        </div>

        {/* YouTube link (videos only) */}
        {resource.video_id && (
          <div>
            <label htmlFor="edit-video" className={labelClass}>
              YouTube link
            </label>
            <input id="edit-video" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputClass} />
          </div>
        )}

        {/* Part 13d: who made it ("the uploader" = the student for approved
            submissions, the admin for admin uploads) */}
        <fieldset>
          <legend className={labelClass}>Who made it?</legend>
          <AuthorFields
            idPrefix={`edit-${resource.id}`}
            value={author}
            onChange={setAuthor}
            disabled={saving}
            selfLabel="The uploader made it"
            showNameLabel="Show the uploader's name"
          />
        </fieldset>

        {/* Solved: question papers and assignments only */}
        {isSolvableType(type) && (
          <SolvedField checked={isSolved} onChange={setIsSolved} disabled={saving} />
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[10px] border-[1.5px] border-sky-line bg-white px-4 text-[15px] font-semibold text-navy outline-none hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-[10px] bg-navy px-5 text-[15px] font-bold text-white outline-none hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}