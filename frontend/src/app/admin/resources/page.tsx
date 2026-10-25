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

// /admin/resources — the ONE admin page for adding and managing resources
// (notes, question papers, assignments and YouTube videos).
// Part 7 merged the old /admin/notes page (typed module name) and the old
// /admin/resources page (PDF only) into this one:
//   - the module is picked from a dropdown, so name/year/semester/programme
//     come from the modules table (no typos, works for super admins too);
//   - Video is a type like any other, using a YouTube link instead of a PDF.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { RESOURCE_TYPES } from "@/lib/resourceTypes";
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
  const router = useRouter();
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
      setError("Please enter a topic.");
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

      if (file.size > 5 * 1024 * 1024) {
        setError("PDF must be 5 MB or smaller.");
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

      const fileInput = document.getElementById(
        "pdf"
      ) as HTMLInputElement;

      if (fileInput) {
        fileInput.value = "";
      }

    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to connect to the backend."
      );
    }

    setUploading(false);
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
      : "Select module";

  if (loading) {
    return (
      <main className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center">
          <p className="text-sm text-ink-soft">
            Loading resources...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-cream p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center">
          <p className="text-sm text-red-600">
            {error || "Access denied."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink">

      {/* Part 12: the old top bar (Back to Dashboard, "Novelle / programme",
          and a profile + logout menu) was removed — the admin sidebar already
          has all of these. A normal page header replaces it. */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-8 md:px-8 lg:px-10">
        <PageHeader
          eyebrow={isSuperAdmin ? "All programmes" : programmeName || "Programme"}
          title="Add resource"
          description="Upload a note, question paper or assignment PDF, or add a YouTube video."
        />
      </div>

      {/* ================= MAIN CONTENT ================= */}

      <div className="mx-auto w-full max-w-7xl px-6 pb-8 md:px-8 lg:px-10">

        {/* Messages */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
            {success}
          </div>
        )}

        {/* ================= TOP SECTION ================= */}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

          {/* ADD RESOURCE */}

          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Add Resource
                </h2>

                <p className="mt-1 text-xs text-ink-soft">
                  Share a note, question paper, assignment, or video.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-wash">
                <Upload className="h-4 w-4 text-ink-soft" />
              </div>
            </div>

            <form
              onSubmit={handleUpload}
              className="space-y-4"
            >

              {/* Topic */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                  Topic
                </label>

                <input
                  type="text"
                  value={topic}
                  onChange={(e) =>
                    setTopic(e.target.value)
                  }
                  placeholder="Enter topic"
                  className="w-full rounded-lg border border-sky-line px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                />
              </div>

              {/* Type */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                  className="w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programme (super admins only) */}

              {isSuperAdmin && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                    Programme
                  </label>

                  <select
                    value={programmeId}
                    onChange={(e) => {
                      setProgrammeId(e.target.value);
                      setModuleId(""); // old module may belong to another programme
                    }}
                    className="w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                  >
                    <option value="">Select programme</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year + Semester (they narrow down the Module list) */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                    Year
                  </label>

                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setModuleId(""); // the module list changes
                    }}
                    className="w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                  >
                    <option value="">Select</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                    Semester
                  </label>

                  <select
                    value={semester}
                    onChange={(e) => {
                      setSemester(e.target.value);
                      setModuleId(""); // the module list changes
                    }}
                    className="w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                  >
                    <option value="">Select</option>

                    <option value="1">
                      Semester 1
                    </option>

                    <option value="2">
                      Semester 2
                    </option>
                  </select>
                </div>

              </div>

              {/* Module (from the modules table) */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-nav">
                  Module
                </label>

                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  disabled={moduleOptions.length === 0}
                  className="w-full rounded-lg border border-sky-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft disabled:bg-cream disabled:text-ink-soft"
                >
                  <option value="">{modulePlaceholder}</option>
                  {moduleOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.module_code} - {m.module_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PDF or YouTube link, depending on the type */}

              {isVideo ? (
                <div>
                  <label
                    htmlFor="video-url"
                    className="mb-1.5 block text-xs font-medium text-ink-nav"
                  >
                    YouTube Link
                  </label>

                  <input
                    id="video-url"
                    type="url"
                    value={videoUrl}
                    onChange={(e) =>
                      setVideoUrl(e.target.value)
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-sky-line px-3 py-2.5 text-sm outline-none transition focus:border-navy-soft focus:ring-1 focus:ring-navy-soft"
                  />

                  <p className="mt-1 text-[10px] text-ink-soft">
                    Tip: for your own lecture recordings, upload them to
                    YouTube as Unlisted and paste the link here.
                  </p>

                  {/* Live preview: thumbnail if the link is valid */}
                  {videoUrl.trim() &&
                    (previewVideoId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={youTubeThumbnail(previewVideoId)}
                        alt="Video thumbnail preview"
                        className="mt-3 aspect-video w-full rounded-lg bg-sky-wash object-cover"
                      />
                    ) : (
                      <p className="mt-2 text-[11px] text-red-600">
                        This doesn&apos;t look like a YouTube video link.
                      </p>
                    ))}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="pdf"
                    className="mb-1.5 block text-xs font-medium text-ink-nav"
                  >
                    PDF File
                  </label>

                  <label
                    htmlFor="pdf"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-sky-line bg-cream px-4 py-5 text-center transition hover:border-sky-line hover:bg-sky-wash"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                      <FileText className="h-4 w-4 text-ink-soft" />
                    </div>

                    <p className="text-xs font-medium text-ink-nav">
                      Select PDF file
                    </p>

                    <p className="mt-1 text-[10px] text-ink-soft">
                      PDF only · Maximum size: 5 MB
                    </p>

                    <input
                      id="pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) =>
                        setFile(
                          e.target.files?.[0] || null
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  {file && (
                    <p className="mt-2 truncate text-[11px] text-ink-soft">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              )}

              {/* Part 13d: who made it (optional) + Solved */}
              <fieldset>
                <legend className="mb-1.5 block text-xs font-medium text-ink-nav">
                  Who made it? <span className="text-ink-soft">(optional)</span>
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
                    className="mt-2 text-xs font-semibold text-navy-soft hover:text-navy hover:underline"
                  >
                    Clear choice
                  </button>
                )}
              </fieldset>

              {isSolvableType(type) && (
                <SolvedField checked={isSolved} onChange={setIsSolved} disabled={uploading} />
              )}

              {/* Upload */}

              <button
                type="submit"
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />

                {uploading
                  ? "Uploading..."
                  : "Upload Resource"}
              </button>

            </form>
          </div>

          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-sky-line bg-white p-8 text-center">
            <FileText className="h-8 w-8 text-ink-soft" />
            <h2 className="mt-4 text-base font-semibold text-ink">Your resource library is separate</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">Browse, search, edit and delete published resources on the All Resources page.</p>
            <button
              type="button"
              onClick={() => router.push("/admin/all-resources")}
              className="mt-5 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-nav transition hover:bg-cream"
            >
              Browse all resources
            </button>
          </div>
        </div>

      </div>

    </main>
  );
}