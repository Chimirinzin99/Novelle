"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  UserCircle,
  LogOut,
  X,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

type Resource = {
  id: number;
  topic: string;
  type: string;
  module_name: string;
  year: number;
  semester: number;
  file_path: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  programme_id: number | null;
};

export default function ManageNotesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [programmeName, setProgrammeName] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);

  const [topic, setTopic] = useState("");
  const [type, setType] = useState("note");
  const [moduleName, setModuleName] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

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

      if (
        profileData.role !== "programme_admin" &&
        profileData.role !== "super_admin"
      ) {
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

      await loadResources();

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  async function loadResources() {
    try {
      const tokenData = await supabase.auth.getSession();

      const token = tokenData.data.session?.access_token;

      if (!token) {
        setError("Authentication session not found.");
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/resources`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to load notes.");
        return;
      }

      setResources(data.resources || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
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

    if (!moduleName.trim()) {
      setError("Please enter a module name.");
      return;
    }

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("PDF must be smaller than 10 MB.");
      return;
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
      formData.append("module_name", moduleName.trim());
      formData.append("year", year);
      formData.append("semester", semester);
      formData.append("file", file);

      const response = await fetch(
        `${BACKEND_URL}/api/resources/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to upload.");
        setUploading(false);
        return;
      }

      setSuccess("Uploaded successfully.");

      setTopic("");
      setType("note");
      setModuleName("");
      setYear("1");
      setSemester("1");
      setFile(null);

      const fileInput = document.getElementById(
        "pdf"
      ) as HTMLInputElement;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadResources();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    }

    setUploading(false);
  }

  async function handleDelete(resource: Resource) {
    const confirmed = window.confirm(
      `Delete "${resource.topic}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError("Your login session has expired.");
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/resources/${resource.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to delete.");
        return;
      }

      setSuccess("Deleted successfully.");

      await loadResources();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    }
  }

  async function handleView(filePath: string | null) {
    if (!filePath) {
      setError("This item does not have a file.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error(error);
      setError("Unable to open the PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  function getTypeLabel(type: string) {
    return type
      .replace("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function ResourceCard({
    resource,
  }: {
    resource: Resource;
  }) {
    return (
      <div className="group flex min-h-[185px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">

        <div className="flex items-center justify-between">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {getTypeLabel(resource.type)}
          </span>

          <FileText className="h-4 w-4 text-gray-300" />
        </div>

        <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
          {resource.topic}
        </h3>

        <p className="mt-1 line-clamp-1 text-xs text-gray-500">
          {resource.module_name}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
            Year {resource.year}
          </span>

          <span className="rounded-md bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
            Semester {resource.semester}
          </span>
        </div>

        <div className="mt-auto flex gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => handleView(resource.file_path)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </button>

          <button
            onClick={() => handleDelete(resource)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    );
  }

  const filteredResources = resources.filter((resource) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return true;
    }

    return (
      resource.topic.toLowerCase().includes(searchText) ||
      resource.module_name
        .toLowerCase()
        .includes(searchText) ||
      getTypeLabel(resource.type)
        .toLowerCase()
        .includes(searchText)
    );
  });

  const filteredRecentResources =
    filteredResources.slice(0, 6);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Loading Manage Notes...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center">
          <p className="text-sm text-red-500">
            {error || "Access denied."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">

      {/* ================= NAVBAR ================= */}

      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-5 md:px-8">

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          <button
            onClick={() => (window.location.href = "/")}
            className="text-lg font-bold tracking-tight text-gray-900 transition hover:text-blue-600"
          >
            Novelle
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-gray-300">/</span>

            <span className="text-sm font-bold text-black">
              {programmeName || "Programme"}
            </span>
          </div>

          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search resources..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() =>
                setProfileOpen((current) => !current)
              }
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 transition hover:bg-gray-50"
            >
              <UserCircle className="h-5 w-5 text-gray-600" />

              <span className="hidden max-w-[120px] truncate text-xs font-medium text-gray-700 lg:block">
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

                <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">

                  <div className="border-b border-gray-100 px-3 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {profile.full_name}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {profile.email}
                    </p>

                    <p className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {profile.role.replace("_", " ")}
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/login";
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition hover:bg-red-50 hover:text-red-600"
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

      {/* ================= MOBILE SEARCH ================= */}

      <div className="border-b border-gray-200 bg-white px-5 py-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search resources..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-gray-400 focus:bg-white"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}

      <div className="w-full px-6 py-8 md:px-8 lg:px-10">

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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Resource
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Share a note, question paper, or assignment.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Upload className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <form
              onSubmit={handleUpload}
              className="space-y-4"
            >

              {/* Topic */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Topic
                </label>

                <input
                  type="text"
                  value={topic}
                  onChange={(e) =>
                    setTopic(e.target.value)
                  }
                  placeholder="Enter topic"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              {/* Module */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Module Name
                </label>

                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) =>
                    setModuleName(e.target.value)
                  }
                  placeholder="Enter module name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              {/* Type */}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="note">Note</option>

                  <option value="question_paper">
                    Question Paper
                  </option>

                  <option value="assignment">
                    Assignment
                  </option>
                </select>
              </div>

              {/* Year + Semester */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Year
                  </label>

                  <select
                    value={year}
                    onChange={(e) =>
                      setYear(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Semester
                  </label>

                  <select
                    value={semester}
                    onChange={(e) =>
                      setSemester(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="1">
                      Semester 1
                    </option>

                    <option value="2">
                      Semester 2
                    </option>
                  </select>
                </div>

              </div>

              {/* PDF */}

              <div>
                <label
                  htmlFor="pdf"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  PDF File
                </label>

                <label
                  htmlFor="pdf"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition hover:border-gray-400 hover:bg-gray-100"
                >
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>

                  <p className="text-xs font-medium text-gray-700">
                    Select PDF file
                  </p>

                  <p className="mt-1 text-[10px] text-gray-400">
                    PDF only · Maximum size: 10 MB
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
                  <p className="mt-2 truncate text-[11px] text-gray-500">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              {/* Upload */}

              <button
                type="submit"
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />

                {uploading
                  ? "Uploading..."
                  : "Upload Resource"}
              </button>

            </form>
          </div>

          {/* RECENTLY UPLOADED */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recently Uploaded
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {search
                    ? `Search results for "${search}"`
                    : "Your latest uploaded resources."}
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                {filteredResources.length} items
              </span>
            </div>

            {filteredRecentResources.length === 0 ? (
              <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  {search
                    ? "No matching resources found."
                    : "No resources uploaded yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredRecentResources.map(
                  (resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= ALL RESOURCES ================= */}

        <div className="mt-8">

          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                All Uploaded Resources
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Manage all your notes, question papers, and assignments.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">
              {filteredResources.length} items
            </span>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                {search
                  ? "No matching resources found."
                  : "No items uploaded yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredResources.map(
                (resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                  />
                )
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}