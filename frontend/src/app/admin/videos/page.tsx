
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Programme = {
  id: number;
  name: string;
  short_name: string;
};

type Module = {
  id: number;
  module_code: string;
  module_name: string;
  programme_id: number;
  year: number;
  semester: number;
  active: boolean;
};

export default function AdminVideosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState("");
  const [userProgrammeId, setUserProgrammeId] = useState<number | null>(
    null
  );

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [programmeId, setProgrammeId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load admin profile
  // --------------------------------------------------

  useEffect(() => {
    const loadAdmin = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, programme_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setError("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (
        profile.role !== "programme_admin" &&
        profile.role !== "super_admin"
      ) {
        router.push("/home");
        return;
      }

      setRole(profile.role);
      setUserProgrammeId(profile.programme_id);

      // Programme admin automatically uses their own programme.
      if (
        profile.role === "programme_admin" &&
        profile.programme_id
      ) {
        setProgrammeId(String(profile.programme_id));
      }

      // Load programmes for super admin.
      const { data: programmeData, error: programmeError } =
        await supabase
          .from("programmes")
          .select("id, name, short_name")
          .order("id");

      if (programmeError) {
        setError("Unable to load programmes.");
      } else {
        setProgrammes(programmeData || []);
      }

      setLoading(false);
    };

    loadAdmin();
  }, [router]);

  // --------------------------------------------------
  // Load modules whenever programme changes
  // --------------------------------------------------

  useEffect(() => {
    const loadModules = async () => {
      if (!programmeId) {
        setModules([]);
        setModuleId("");
        return;
      }

      const { data, error: moduleError } = await supabase
        .from("modules")
        .select(
          "id, module_code, module_name, programme_id, year, semester, active"
        )
        .eq("programme_id", Number(programmeId))
        .eq("active", true)
        .order("year")
        .order("semester")
        .order("module_code");

      if (moduleError) {
        setError("Unable to load modules.");
        setModules([]);
        return;
      }

      setModules(data || []);
      setModuleId("");
    };

    loadModules();
  }, [programmeId]);

  // --------------------------------------------------
  // Submit video
  // --------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Please enter a video title.");
      return;
    }

    if (!youtubeUrl.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }

    if (!programmeId) {
      setError("Please select a programme.");
      return;
    }

    if (!moduleId) {
      setError("Please select a module.");
      return;
    }

    if (!year) {
      setError("Please select a year.");
      return;
    }

    if (!semester) {
      setError("Please select a semester.");
      return;
    }

    // Check that the URL is actually a YouTube URL.
    let url: URL;

    try {
      url = new URL(youtubeUrl.trim());
    } catch {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    const isYouTube =
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtu.be";

    if (!isYouTube) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error: insertError } = await supabase
        .from("videos")
        .insert({
          title: title.trim(),
          youtube_url: youtubeUrl.trim(),
          programme_id: Number(programmeId),
          module_id: Number(moduleId),
          year: Number(year),
          semester: Number(semester),
          uploaded_by: user.id,
        });

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        return;
      }

      setMessage("Video added successfully.");

      // Clear form
      setTitle("");
      setYoutubeUrl("");
      setModuleId("");
      setYear("");
      setSemester("");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while adding the video.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-200 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-gray-500">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-200 px-6 py-8 text-gray-900 md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>

            Back to Dashboard
          </button>

          <p className="mb-3 text-sm font-medium text-red-600">
            Admin / Videos
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Add Related Video
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
            Add a useful YouTube video for students in your
            programme.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >

          {/* Title */}
          <div className="mb-6">
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Video Title
            </label>

            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Data Structures"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* YouTube URL */}
          <div className="mb-6">
            <label
              htmlFor="youtubeUrl"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              YouTube URL
            </label>

            <input
              id="youtubeUrl"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />

            <p className="mt-2 text-xs text-gray-400">
              Paste the normal YouTube video link.
            </p>
          </div>

          {/* Programme */}
          <div className="mb-6">
            <label
              htmlFor="programme"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Programme
            </label>

            {role === "programme_admin" ? (
              <select
                id="programme"
                value={programmeId}
                disabled
                className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-600"
              >
                <option value="">
                  Your programme
                </option>

                {programmes
                  .filter(
                    (programme) =>
                      programme.id === userProgrammeId
                  )
                  .map((programme) => (
                    <option
                      key={programme.id}
                      value={programme.id}
                    >
                      {programme.name} ({programme.short_name})
                    </option>
                  ))}
              </select>
            ) : (
              <select
                id="programme"
                value={programmeId}
                onChange={(e) => {
                  setProgrammeId(e.target.value);
                  setModuleId("");
                  setYear("");
                  setSemester("");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">
                  Select programme
                </option>

                {programmes.map((programme) => (
                  <option
                    key={programme.id}
                    value={programme.id}
                  >
                    {programme.name} ({programme.short_name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Module */}
          <div className="mb-6">
            <label
              htmlFor="module"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Module
            </label>

            <select
              id="module"
              value={moduleId}
              onChange={(e) => {
                const selectedModule = modules.find(
                  (module) =>
                    module.id === Number(e.target.value)
                );

                setModuleId(e.target.value);

                if (selectedModule) {
                  setYear(String(selectedModule.year));
                  setSemester(
                    String(selectedModule.semester)
                  );
                }
              }}
              disabled={!programmeId}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {programmeId
                  ? "Select module"
                  : "Select programme first"}
              </option>

              {modules.map((module) => (
                <option
                  key={module.id}
                  value={module.id}
                >
                  {module.module_code} —{" "}
                  {module.module_name}
                </option>
              ))}
            </select>
          </div>

          {/* Year and Semester */}
          <div className="mb-6 grid gap-6 md:grid-cols-2">

            {/* Year */}
            <div>
              <label
                htmlFor="year"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Year
              </label>

              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            {/* Semester */}
            <div>
              <label
                htmlFor="semester"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Semester
              </label>

              <select
                id="semester"
                value={semester}
                onChange={(e) =>
                  setSemester(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">
                  Select semester
                </option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding Video..." : "Add Video"}
          </button>

        </form>
      </div>
    </main>
  );
}

