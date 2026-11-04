"use client";

// Part 13d: optional "Who made it?" (I made this = the admin's own name /
// someone else + name / not sure) and, for question papers and assignments,
// a Solved tick box. Sent with the upload (backend utils/author.ts).
// Part 12: hard-coded colours (gray/blue/black and old hexes) switched to the
// theme colours from app/globals.css (navy, ink, line, sky-…, gold-…).
// Part 12 also removed this page's old resource list code (the card, the
// Edit window, delete/view/reload): the page stopped showing the list in the
// 21 Oct redesign, so that code could never run. Editing and deleting now
// happen on /admin/all-resources (components/EditResourceDialog.tsx).

// 4 Nov redesign: same look as the student upload page (/submit-note) — one
// column of numbered steps: 1 type (cards, incl. Video), 2 title, 3 where it
// belongs (programme for super admins, year, semester, module — required),
// 4 PDF (drag & drop) or YouTube link, 5 who made it (optional) + Solved.
// The empty "Your resource library is separate" box is gone: the sidebar now
// has "All Resources". The upload logic (handleUpload) is unchanged; the form
// still sends `topic` (shown as "Title", like the Edit window).

// /admin/resources — the ONE admin page for adding and managing resources
// (notes, question papers, assignments and YouTube videos).
// Part 7 merged the old /admin/notes page (typed module name) and the old
// /admin/resources page (PDF only) into this one:
//   - the module is picked from a dropdown, so name/year/semester/programme
//     come from the modules table (no typos, works for super admins too);
//   - Video is a type like any other, using a YouTube link instead of a PDF.

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, FILE_TOO_BIG_MESSAGE } from "@/lib/uploads";
import { RESOURCE_TYPES, resourceTypeBadge } from "@/lib/resourceTypes";
import {
  EMPTY_AUTHOR_FORM,
  appendAuthorFields,
  appendSolvedField,
  authorFormError,
  isSolvableType,
  type AuthorForm,
} from "@/lib/author";
import AuthorFields, { SolvedField } from "@/components/AuthorFields";
import {
  parseYouTubeId,
  youTubeThumbnail,
} from "@/lib/youtube";

// Same as the student page (Architecture has 5 years).
const YEARS = [1, 2, 3, 4, 5];
const TITLE_MAX = 120;

// One line under each type card.
const TYPE_HINTS: Record<string, string> = {
  note: "Lecture or study notes",
  question_paper: "A past exam or test paper",
  assignment: "An assignment or coursework sheet",
  video: "A YouTube link",
};

// "1.2 MB" / "350 KB" for the chosen-file row.
function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

// Only needed by super admins, to pick which programme they are uploading for.
type Programme = {
  id: number;
  name: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  programme_id: number | null;
};

export default function ManageResourcesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [programmeName, setProgrammeName] = useState("");

  // Dropdown data
  const [modules, setModules] = useState<Module[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  // Form fields
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("note");
  const [programmeId, setProgrammeId] = useState(""); // super admin only
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  // Part 13d: optional credit + Solved
  const [author, setAuthor] = useState<AuthorForm>(EMPTY_AUTHOR_FORM);
  const [isSolved, setIsSolved] = useState(false);

  // Videos use a YouTube link instead of a PDF.
  const isVideo = type === "video";
  // Worked out on every render, so the preview updates while typing.
  const previewVideoId = parseYouTubeId(videoUrl);

  // Super admin? (rule in lib/roles.ts) Decides whether the Programme
  // dropdown is shown and required.
  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false); // PDF dragged over the drop zone


  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please log in.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, email, role, programme_id")
          .eq("id", user.id)
          .single();

      if (profileError || !profileData) {
        console.error(profileError);
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      // lib/roles.ts decides who counts as an admin.
      if (!isAdminRole(profileData.role)) {
        setError("You do not have permission to access this page.");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (profileData.programme_id) {
        const { data: programmeData } = await supabase
          .from("programmes")
          .select("name")
          .eq("id", profileData.programme_id)
          .single();

        if (programmeData) {
          setProgrammeName(programmeData.name);
        }
      }

      // Super admins upload for any programme, so they get a Programme
      // dropdown. Programme admins always upload to their own programme.
      if (isSuperAdminRole(profileData.role)) {
        const { data: programmeList } = await supabase
          .from("programmes")
          .select("id, name")
          .order("name");

        setProgrammes(programmeList || []);
      }

      // Load the module list and the resources at the same time.
      await loadModules();

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  // Modules for the Module dropdown. The backend already limits programme
  // admins to their own programme's modules.
  async function loadModules() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        return;
      }

      const response = await callBackend(`${BACKEND_URL}/api/modules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message || "Unable to load modules.");
        return;
      }

      setModules(data.modules || []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to connect to the backend."
      );
    }
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!topic.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (isSuperAdmin && !programmeId) {
      setError("Please select a programme.");
      return;
    }

    if (!year || !semester) {
      setError("Please select a year and semester.");
      return;
    }

    if (!moduleId) {
      setError("Please select a module.");
      return;
    }

    if (isVideo) {
      if (!previewVideoId) {
        setError("Please enter a valid YouTube video link.");
        return;
      }
    } else {
      if (!file) {
        setError("Please select a PDF file.");
        return;
      }

      if (file.type !== "application/pdf") {
        setError("Only PDF files are allowed.");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setError(FILE_TOO_BIG_MESSAGE);
        return;
      }
    }

    // Part 13d: the credit is optional for admins, but must be complete
    if (author.authorType) {
      const authorProblem = authorFormError(author);
      if (authorProblem) {
        setError(authorProblem);
        return;
      }
    }

    setUploading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError(
          "Your login session has expired. Please log in again."
        );
        setUploading(false);
        return;
      }

      const formData = new FormData();

      formData.append("topic", topic.trim());
      formData.append("type", type);
      // The backend takes the module name, year, semester and programme
      // from this module, so we don't send them separately.
      formData.append("module_id", moduleId);

      // Send either the YouTube link or the PDF, never both.
      if (isVideo) {
        formData.append("video_url", videoUrl.trim());
      } else if (file) {
        formData.append("file", file);
      }

      // Part 13d: an admin's "I made this" always shows their own name
      appendAuthorFields(formData, { ...author, showName: true });
      appendSolvedField(formData, isSolvableType(type) && isSolved);

      const response = await callBackend(
        `${BACKEND_URL}/api/resources/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message || "Failed to upload.");
        setUploading(false);
        return;
      }

      setSuccess("Uploaded successfully.");

      // Clear the form (the programme choice is kept, which helps when a
      // super admin adds several resources for the same programme).
      setTopic("");
      setType("note");
      setYear("");
      setSemester("");
      setModuleId("");
      setFile(null);
      setVideoUrl("");
      setAuthor(EMPTY_AUTHOR_FORM);
      setIsSolved(false);

      clearFileInput();

    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to connect to the backend."
      );
    }

    setUploading(false);
  }

  // The hidden file input keeps its last file; empty it so the same file
  // can be chosen again after Remove / Clear / a refusal.
  function clearFileInput() {
    const input = document.getElementById("pdf-file") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  // A PDF was picked or dropped: check it at once (the backend checks again).
  function selectFile(picked: File | null) {
    setError("");
    setSuccess("");
    if (!picked) {
      setFile(null);
      return;
    }
    const isPdf =
      picked.type === "application/pdf" || picked.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFile(null);
      setError("That file is not a PDF. Choose a .pdf file to continue.");
      clearFileInput();
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError(`That file is larger than ${MAX_UPLOAD_MB} MB. Choose a smaller PDF.`);
      clearFileInput();
      return;
    }
    setFile(picked);
  }

  function removeFile() {
    setFile(null);
    clearFileInput();
  }

  // Clear button: empty the form (the programme choice is kept, as after an upload).
  function clearForm() {
    setTopic("");
    setType("note");
    setYear("");
    setSemester("");
    setModuleId("");
    setFile(null);
    setVideoUrl("");
    setAuthor(EMPTY_AUTHOR_FORM);
    setIsSolved(false);
    setError("");
    setSuccess("");
    clearFileInput();
  }

  // Active modules for a year + semester (and programme, for super admins).
  function modulesFor(programme: string, yr: string, sem: string) {
    return modules.filter(
      (m) =>
        m.active &&
        m.year === Number(yr) &&
        m.semester === Number(sem) &&
        (!isSuperAdmin || m.programme_id === Number(programme))
    );
  }

  // Modules offered in the Add form's Module dropdown.
  const moduleOptions = modulesFor(programmeId, year, semester);

  // Text for the empty first option of the Module dropdown.
  const modulePlaceholder =
    isSuperAdmin && !programmeId
      ? "Select a programme first"
      : !year || !semester
      ? "Select year and semester first"
      : moduleOptions.length === 0
      ? "No active modules for this year/semester"
      : "Choose module";

  const inputClass =
    "h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint disabled:cursor-not-allowed disabled:bg-sky-wash disabled:text-ink-soft";
  const stepLabel = "mb-2 block font-display text-base font-bold text-navy";
  const fieldLabel = "mb-1.5 block text-sm font-medium text-ink-nav";

  if (loading) {
    return (
      <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-10 text-center">
          <p className="text-sm text-ink-soft">Loading…</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-10 text-center">
          <p className="text-sm text-red-700">{error || "Access denied."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow={isSuperAdmin ? "All programmes" : programmeName || "Programme"}
          title="Add resource"
          description="Upload a note, question paper or assignment PDF, or add a YouTube video. It is published straight away."
        />

        <form onSubmit={handleUpload} className="flex flex-col gap-7 rounded-2xl border border-line bg-white p-5 sm:p-7">
          {/* 1. Type — four cards (real radio buttons: Tab to the group,
                 arrow keys to choose). Video is admin-only. */}
          <fieldset disabled={uploading}>
            <legend className={stepLabel}>1. What are you adding?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {RESOURCE_TYPES.map((t) => {
                const selected = type === t.code;
                return (
                  <label
                    key={t.code}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border-2 p-4 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-sky-tint ${
                      selected ? "border-navy bg-sky-wash" : "border-sky-line bg-white hover:border-navy-soft"
                    }`}
                  >
                    <input
                      type="radio"
                      name="resource-type"
                      value={t.code}
                      checked={selected}
                      onChange={() => {
                        setType(t.code);
                        setError("");
                      }}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${resourceTypeBadge(t.code)}`}>{t.label}</span>
                      {/* tick for the chosen one */}
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          selected ? "border-navy bg-navy text-white" : "border-sky-line"
                        }`}
                      >
                        {selected && (
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </span>
                    <span className="text-sm text-ink-soft">{TYPE_HINTS[t.code]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2. Title (saved as the resource's topic) */}
          <div>
            <label htmlFor="resource-title" className={stepLabel}>
              2. Title
            </label>
            <input
              id="resource-title"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Introduction to Programming — Unit 3 notes"
              disabled={uploading}
              maxLength={TITLE_MAX}
              aria-describedby="title-help"
              className={inputClass}
            />
            <p id="title-help" className="mt-1.5 flex justify-between gap-3 text-sm text-ink-soft">
              <span>A clear title helps students find it.</span>
              <span aria-live="polite">
                {topic.length}/{TITLE_MAX}
              </span>
            </p>
          </div>

          {/* 3. Where it belongs. The backend copies the module's name, year,
                 semester and programme, so the module is required. */}
          <fieldset disabled={uploading}>
            <legend className={stepLabel}>3. Where does it belong?</legend>

            {/* Super admins choose the programme first */}
            {isSuperAdmin && (
              <div className="mb-3">
                <label htmlFor="resource-programme" className={fieldLabel}>
                  Programme
                </label>
                <select
                  id="resource-programme"
                  value={programmeId}
                  onChange={(e) => {
                    setProgrammeId(e.target.value);
                    setModuleId(""); // old module may belong to another programme
                  }}
                  className={inputClass}
                >
                  <option value="">Choose programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="resource-year" className={fieldLabel}>
                  Year
                </label>
                <select
                  id="resource-year"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setModuleId(""); // the module list changes
                  }}
                  className={inputClass}
                >
                  <option value="">Choose year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="resource-semester" className={fieldLabel}>
                  Semester
                </label>
                <select
                  id="resource-semester"
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setModuleId(""); // the module list changes
                  }}
                  className={inputClass}
                >
                  <option value="">Choose semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="resource-module" className={fieldLabel}>
                Module
              </label>
              <select
                id="resource-module"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={moduleOptions.length === 0}
                className={inputClass}
              >
                <option value="">{modulePlaceholder}</option>
                {moduleOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.module_code} – {m.module_name}
                  </option>
                ))}
              </select>
              {/* Chosen year/semester but nothing to pick: say what to do */}
              {year && semester && (!isSuperAdmin || programmeId) && moduleOptions.length === 0 && (
                <p className="mt-2 text-sm text-ink-soft">
                  {isSuperAdmin
                    ? "Add or activate a module for this year and semester on Manage Modules first."
                    : "Ask the super admin to add a module for this year and semester."}
                </p>
              )}
            </div>
          </fieldset>

          {/* 4. The file: a YouTube link for videos, otherwise a PDF */}
          {/* key: the two branches are different boxes. Without it React reuses
              the same <input> for the PDF picker and the YouTube link, which
              React warns about (uncontrolled -> controlled input). */}
          {isVideo ? (
            <div key="video">
              <label htmlFor="video-url" className={stepLabel}>
                4. YouTube link
              </label>
              <input
                id="video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={uploading}
                aria-describedby="video-help"
                className={inputClass}
              />
              <p id="video-help" className="mt-1.5 text-sm text-ink-soft">
                Tip: for your own lecture recordings, upload them to YouTube as Unlisted and paste the link here.
              </p>

              {/* Live preview: thumbnail if the link is valid */}
              {videoUrl.trim() &&
                (previewVideoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={youTubeThumbnail(previewVideoId)}
                    alt="Video thumbnail preview"
                    className="mt-3 aspect-video w-full max-w-sm rounded-xl bg-sky-wash object-cover"
                  />
                ) : (
                  <p className="mt-2 text-sm text-red-700">This doesn&apos;t look like a YouTube video link.</p>
                ))}
            </div>
          ) : (
            <div key="pdf">
              <p id="pdf-label" className={stepLabel}>
                4. PDF file
              </p>

              {/* The real file input, hidden; the drop zone below is its label. */}
              <input
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => selectFile(e.target.files?.[0] || null)}
                disabled={uploading}
                aria-labelledby="pdf-label"
                className="sr-only"
              />

              {file ? (
                <div className="flex items-center gap-3 rounded-xl border-2 border-sky-line bg-sky-wash p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-navy">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <path d="M14 3v6h6" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{file.name}</p>
                    <p className="text-sm text-ink-soft">{fileSize(file.size)} · PDF</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={uploading}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-soft outline-none hover:bg-white hover:text-navy focus-visible:ring-2 focus-visible:ring-navy/40"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="pdf-file"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-5 py-9 text-center transition ${
                    isDragging ? "border-navy-soft bg-sky-tint" : "border-sky-line bg-cream hover:border-navy-soft hover:bg-sky-wash"
                  } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!uploading) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!uploading) selectFile(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <svg viewBox="0 0 24 24" className="mb-1 h-8 w-8 text-navy" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                    <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
                  </svg>
                  <span className="font-bold text-ink">Drop your PDF here, or click to choose</span>
                  <span className="text-sm text-ink-soft">PDF only · {MAX_UPLOAD_MB} MB maximum</span>
                </label>
              )}
            </div>
          )}

          {/* 5. Who made it? (Part 13d) — optional for admins; an admin's
                 "I made this" always shows their own name. */}
          <fieldset disabled={uploading}>
            <legend className={stepLabel}>
              5. Who made it? <span className="font-sans text-sm font-normal text-ink-soft">(optional)</span>
            </legend>
            <AuthorFields
              idPrefix="admin-upload"
              value={author}
              onChange={setAuthor}
              disabled={uploading}
              selfLabel="I made this"
            />
            {author.authorType && (
              <button
                type="button"
                onClick={() => setAuthor(EMPTY_AUTHOR_FORM)}
                className="mt-2 text-sm font-semibold text-navy-soft hover:text-navy hover:underline"
              >
                Clear choice
              </button>
            )}

            {/* Solved / Unsolved: question papers and assignments only */}
            {isSolvableType(type) && (
              <div className="mt-4 border-t border-line pt-4">
                <SolvedField checked={isSolved} onChange={setIsSolved} disabled={uploading} />
              </div>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {success}
            </p>
          )}

          {/* What happens next + the buttons */}
          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-navy-soft" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Students see it straight away. You can edit or delete it later on All Resources.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={clearForm}
                disabled={uploading}
                className="h-12 rounded-xl border-[1.5px] border-sky-line bg-white px-5 text-[15px] font-semibold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 disabled:opacity-60"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="h-12 rounded-xl bg-navy px-6 font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Adding…" : isVideo ? "Add video" : "Upload resource"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
