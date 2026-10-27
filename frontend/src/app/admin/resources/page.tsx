"use client";

// /admin/resources — the ONE admin page for adding and managing resources
// (notes, question papers, assignments and YouTube videos).
// Part 7 merged the old /admin/notes page (typed module name) and the old
// /admin/resources page (PDF only) into this one:
//   - the module is picked from a dropdown, so name/year/semester/programme
//     come from the modules table (no typos, works for super admins too);
//   - Video is a type like any other, using a YouTube link instead of a PDF.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserCircle,
  LogOut,
  X,
  FileText,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { RESOURCE_TYPES } from "@/lib/resourceTypes";
import {
  parseYouTubeId,
  youTubeThumbnail,
} from "@/lib/youtube";

type Resource = {
  id: number;
  topic: string;
  type: string;
  module_id: number | null; // null for old uploads that typed the module name
  module_name: string;
  programme_id: number;
  year: number;
  semester: number;
  file_path: string | null;
  video_id: string | null; // set only for videos
  created_at: string;
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
  const [, setResources] = useState<Resource[]>([]);

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

  const [profileOpen, setProfileOpen] = useState(false);

  // Edit window. `editing` is the resource being edited (null = closed);
  // the edit* fields are a copy the admin changes before pressing Save.
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editType, setEditType] = useState("note");
  const [editProgrammeId, setEditProgrammeId] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editModuleId, setEditModuleId] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    async function loadPage() {
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

    loadPage();
  }, []);

  async function loadResources() {
    try {
      const tokenData = await supabase.auth.getSession();

      const token = tokenData.data.session?.access_token;

      if (!token) {
        setError("Authentication session not found.");
        return;
      }

      const response = await callBackend(
        `${BACKEND_URL}/api/resources`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message || "Unable to load notes.");
        return;
      }

      setResources(data.resources || []);
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

  // Send only what changed to PUT /api/resources/:id.
  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    setError("");
    setSuccess("");

    if (!editTopic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    const changes: Record<string, string> = {};

    if (editTopic.trim() !== editing.topic) {
      changes.topic = editTopic.trim();
    }

    if (editType !== editing.type) {
      changes.type = editType;
    }

    if (editModuleId && editModuleId !== String(editing.module_id)) {
      changes.module_id = editModuleId;
    }

    if (editing.video_id) {
      const newVideoId = parseYouTubeId(editVideoUrl);

      if (!newVideoId) {
        setError("Please enter a valid YouTube video link.");
        return;
      }

      if (newVideoId !== editing.video_id) {
        changes.video_url = editVideoUrl.trim();
      }
    }

    if (Object.keys(changes).length === 0) {
      setEditing(null); // nothing changed: just close
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError("Your login session has expired.");
        setSaving(false);
        return;
      }

      const response = await callBackend(
        `${BACKEND_URL}/api/resources/${editing.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(changes),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message || "Failed to save changes.");
        setSaving(false);
        return;
      }

      setSuccess("Changes saved.");
      setEditing(null);

      await loadResources();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to connect to the backend."
      );
    }

    setSaving(false);
  }

  // Active modules for a year + semester (and programme, for super admins).
  // Used by both the Add form and the Edit window.
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

  // Modules offered in the Edit window's Module dropdown.
  const editModuleOptions = modulesFor(
    editProgrammeId,
    editYear,
    editSemester
  );

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
      <main className="min-h-screen bg-slate-50 dark:bg-[#0E141D] p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white dark:bg-[#172130] p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-[#8B98AA]">
            Loading resources...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0E141D] p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white dark:bg-[#172130] p-10 text-center">
          <p className="text-sm text-red-500 dark:text-red-400">
            {error || "Access denied."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0E141D] text-gray-900 dark:text-[#E5EAF1]">

      {/* ================= NAVBAR ================= */}

      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-5 md:px-8">

          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2 text-xs font-medium text-gray-700 dark:text-[#B4BFCD] transition hover:border-gray-400 dark:hover:border-[#33445A] hover:bg-gray-50 dark:hover:bg-[#1D2938]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="hidden h-6 w-px bg-gray-200 dark:bg-[#263446] sm:block" />

          <button
            onClick={() => router.push("/")}
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#E5EAF1] transition hover:text-blue-600 dark:hover:text-blue-300"
          >
            Novelle
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-gray-300 dark:text-[#6B788A]">/</span>

            <span className="text-sm font-bold text-black dark:text-[#E5EAF1]">
              {/* The super admin works across programmes, so their own
                  profile programme isn't shown here. */}
              {isSuperAdmin ? "All programmes" : programmeName || "Programme"}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() =>
                setProfileOpen((current) => !current)
              }
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] px-2.5 py-2 transition hover:bg-gray-50 dark:hover:bg-[#1D2938]"
            >
              <UserCircle className="h-5 w-5 text-gray-600 dark:text-[#B4BFCD]" />

              <span className="hidden max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-[#B4BFCD] lg:block">
                {profile.full_name || "Admin"}
              </span>
            </button>

            {profileOpen && (
              <>
                <button
                  aria-label="Close profile menu"
                  onClick={() => setProfileOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />

                <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-2 shadow-lg">

                  <div className="border-b border-gray-100 dark:border-[#263345] px-3 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-[#E5EAF1]">
                      {profile.full_name}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-[#8B98AA]">
                      {profile.email}
                    </p>

                    <p className="mt-2 inline-block rounded-full bg-gray-100 dark:bg-[#1D2938] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-[#8B98AA]">
                      {profile.role.replace("_", " ")}
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/login");
                      router.refresh();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-[#B4BFCD] transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ================= MAIN CONTENT ================= */}

      <div className="w-full px-6 py-8 md:px-8 lg:px-10">

        {/* Messages */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {/* ================= TOP SECTION ================= */}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

          {/* ADD RESOURCE */}

          <div className="rounded-2xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-5 shadow-sm">

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E5EAF1]">
                  Add Resource
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-[#8B98AA]">
                  Share a note, question paper, assignment, or video.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1D2938]">
                <Upload className="h-4 w-4 text-gray-500 dark:text-[#8B98AA]" />
              </div>
            </div>

            <form
              onSubmit={handleUpload}
              className="space-y-4"
            >

              {/* Topic */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Topic
                </label>

                <input
                  type="text"
                  value={topic}
                  onChange={(e) =>
                    setTopic(e.target.value)
                  }
                  placeholder="Enter topic"
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                />
              </div>

              {/* Type */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
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
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                    Programme
                  </label>

                  <select
                    value={programmeId}
                    onChange={(e) => {
                      setProgrammeId(e.target.value);
                      setModuleId(""); // old module may belong to another programme
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
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
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                    Year
                  </label>

                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setModuleId(""); // the module list changes
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                  >
                    <option value="">Select</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                    Semester
                  </label>

                  <select
                    value={semester}
                    onChange={(e) => {
                      setSemester(e.target.value);
                      setModuleId(""); // the module list changes
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
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
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Module
                </label>

                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  disabled={moduleOptions.length === 0}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400 disabled:bg-gray-50 dark:disabled:bg-[#0E141D] disabled:text-gray-400 dark:disabled:text-[#6B788A]"
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
                    className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]"
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
                    className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                  />

                  <p className="mt-1 text-[10px] text-gray-400 dark:text-[#6B788A]">
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
                        className="mt-3 aspect-video w-full rounded-lg bg-gray-100 dark:bg-[#1D2938] object-cover"
                      />
                    ) : (
                      <p className="mt-2 text-[11px] text-red-500 dark:text-red-400">
                        This doesn&apos;t look like a YouTube video link.
                      </p>
                    ))}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="pdf"
                    className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]"
                  >
                    PDF File
                  </label>

                  <label
                    htmlFor="pdf"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-[#33445A] bg-gray-50 dark:bg-[#0E141D] px-4 py-5 text-center transition hover:border-gray-400 dark:hover:border-[#33445A] hover:bg-gray-100 dark:hover:bg-[#263446]"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#172130] shadow-sm">
                      <FileText className="h-4 w-4 text-gray-500 dark:text-[#8B98AA]" />
                    </div>

                    <p className="text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                      Select PDF file
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400 dark:text-[#6B788A]">
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
                    <p className="mt-2 truncate text-[11px] text-gray-500 dark:text-[#8B98AA]">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              )}

              {/* Upload */}

              <button
                type="submit"
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-[#3A649C] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-700 dark:hover:bg-[#33598C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />

                {uploading
                  ? "Uploading..."
                  : "Upload Resource"}
              </button>

            </form>
          </div>

          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] p-8 text-center">
            <FileText className="h-8 w-8 text-gray-400 dark:text-[#6B788A]" />
            <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-[#E5EAF1]">Your resource library is separate</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-[#8B98AA]">Browse, search, and remove published resources from the All Resources page.</p>
            <button
              type="button"
              onClick={() => router.push("/admin/all-resources")}
              className="mt-5 rounded-lg border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-[#B4BFCD] transition hover:bg-gray-50 dark:hover:bg-[#1D2938]"
            >
              Browse all resources
            </button>
          </div>
        </div>

      </div>

      {/* ================= EDIT WINDOW ================= */}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-[#3A649C]/40 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white dark:bg-[#172130] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E5EAF1]">
                  Edit Resource
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-[#8B98AA]">
                  Currently: {editing.module_name} · Year {editing.year} ·
                  Semester {editing.semester}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-gray-400 dark:text-[#6B788A] hover:bg-gray-100 dark:hover:bg-[#263446] hover:text-gray-700 dark:hover:text-[#B4BFCD]"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Topic */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                Topic
              </label>
              <input
                type="text"
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
              />
            </div>

            {/* Type: a video stays a video, a PDF stays a PDF type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                Type
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                disabled={editing.type === "video"}
                className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400 disabled:bg-gray-50 dark:disabled:bg-[#0E141D] disabled:text-gray-400 dark:disabled:text-[#6B788A]"
              >
                {RESOURCE_TYPES.filter(
                  (t) =>
                    (t.code === "video") === (editing.type === "video")
                ).map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Programme (super admins only) */}
            {isSuperAdmin && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Programme
                </label>
                <select
                  value={editProgrammeId}
                  onChange={(e) => {
                    setEditProgrammeId(e.target.value);
                    setEditModuleId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
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

            {/* Year + Semester narrow down the Module list */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Year
                </label>
                <select
                  value={editYear}
                  onChange={(e) => {
                    setEditYear(e.target.value);
                    setEditModuleId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  Semester
                </label>
                <select
                  value={editSemester}
                  onChange={(e) => {
                    setEditSemester(e.target.value);
                    setEditModuleId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
            </div>

            {/* Module: leaving it empty keeps the current module */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                Module
              </label>
              <select
                value={editModuleId}
                onChange={(e) => setEditModuleId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
              >
                <option value="">Keep current module</option>
                {editModuleOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.module_code} - {m.module_name}
                  </option>
                ))}
              </select>
            </div>

            {/* YouTube link (videos only). The PDF of other types can't be
                swapped here: delete it and upload the new one instead. */}
            {editing.video_id && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-[#B4BFCD]">
                  YouTube Link
                </label>
                <input
                  type="url"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-slate-400"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-200 dark:border-[#263345] px-4 py-2 text-xs font-medium text-gray-600 dark:text-[#B4BFCD] hover:bg-gray-50 dark:hover:bg-[#1D2938]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 dark:bg-[#3A649C] px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 dark:hover:bg-[#33598C] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}