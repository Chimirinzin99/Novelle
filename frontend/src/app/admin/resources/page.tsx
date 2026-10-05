"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

type Resource = {
  id: number;
  title: string;
  type: "note" | "question_paper" | "assignment";
  programme_id: number;
  module_id: number;
  year: number;
  semester: number;
  file_path: string;
  uploaded_by: string;
  created_at: string;
};

type Module = {
  id: number;
  programme_id: number;
  module_code: string;
  module_name: string;
  year: number;
  semester: number;
  active: boolean;
};

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"note" | "question_paper">("note");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);
  const [message, setMessage] = useState("");

  // =========================
  // FETCH MODULES
  // =========================

  const fetchModules = async () => {
    try {
      setLoadingModules(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Please log in first.");
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/modules`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      console.log("Modules API response:", data);

      if (!response.ok) {
        setMessage(data.message || "Failed to load modules.");
        return;
      }

      setModules(data.modules || []);
    } catch (error) {
      console.error("Module fetch error:", error);
      setMessage("Could not connect to the backend.");
    } finally {
      setLoadingModules(false);
    }
  };

  // =========================
  // FETCH RESOURCES
  // =========================

  const fetchResources = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/resources`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      console.log("Resources API response:", data);

      if (response.ok) {
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error("Resource fetch error:", error);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchResources();
  }, []);

  // =========================
  // FILTER MODULES
  // =========================

  const filteredModules = modules.filter((module) => {
    if (!year || !semester) {
      return true;
    }

    return (
      module.year === Number(year) &&
      module.semester === Number(semester) &&
      module.active === true
    );
  });

  // =========================
  // HANDLE UPLOAD
  // =========================

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter a resource title.");
      return;
    }

    if (!year) {
      setMessage("Please select a year.");
      return;
    }

    if (!semester) {
      setMessage("Please select a semester.");
      return;
    }

    if (!moduleId) {
      setMessage("Please select a module.");
      return;
    }

    if (!file) {
      setMessage("Please select a PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("PDF must be 10 MB or smaller.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Please log in first.");
        return;
      }

      const formData = new FormData();

      formData.append("file", file);
      formData.append("title", title);
      formData.append("type", type);
      formData.append("module_id", moduleId);
      formData.append("year", year);
      formData.append("semester", semester);

      const response = await fetch(
        `${BACKEND_URL}/api/resources/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      console.log("Upload response:", data);

      if (!response.ok) {
        setMessage(data.message || "Upload failed.");
        return;
      }

      setMessage("Resource uploaded successfully.");

      // Clear form
      setTitle("");
      setType("note");
      setYear("");
      setSemester("");
      setModuleId("");
      setFile(null);

      const fileInput = document.getElementById(
        "resource-file"
      ) as HTMLInputElement;

      if (fileInput) {
        fileInput.value = "";
      }

      await fetchResources();
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Resource Management
          </h1>

          <p className="mt-2 text-gray-600">
            Upload notes and question papers for your programme.
          </p>
        </div>

        {/* UPLOAD FORM */}
        <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">
            Upload Resource
          </h2>

          <form onSubmit={handleUpload} className="space-y-5">

            {/* TITLE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Resource Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Programming Fundamentals Notes"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-black"
              />
            </div>

            {/* TYPE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Resource Type
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as
                      | "note"
                      | "question_paper"
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none"
              >
                <option value="note">Note</option>
                <option value="question_paper">
                  Question Paper
                </option>
              </select>
            </div>

            {/* YEAR + SEMESTER */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* YEAR */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Year
                </label>

                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setModuleId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none"
                >
                  <option value="">Select Year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>

              {/* SEMESTER */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Semester
                </label>

                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setModuleId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none"
                >
                  <option value="">Select Semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
            </div>

            {/* MODULE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Module
              </label>

              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={loadingModules || !year || !semester}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">
                  {loadingModules
                    ? "Loading modules..."
                    : !year || !semester
                    ? "Select year and semester first"
                    : filteredModules.length === 0
                    ? "No modules available"
                    : "Select Module"}
                </option>

                {filteredModules.map((module) => (
                  <option
                    key={module.id}
                    value={module.id}
                  >
                    {module.module_code} -{" "}
                    {module.module_name}
                  </option>
                ))}
              </select>

              {/* DEBUG INFORMATION */}
              {!loadingModules &&
                year &&
                semester &&
                filteredModules.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    No active modules found for Year {year},
                    Semester {semester}.
                  </p>
                )}
            </div>

            {/* PDF */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                PDF File
              </label>

              <input
                id="resource-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
              />

              <p className="mt-2 text-sm text-gray-500">
                PDF only. Maximum size: 10 MB.
              </p>
            </div>

            {/* MESSAGE */}
            {message && (
              <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800">
                {message}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading
                ? "Uploading..."
                : "Upload Resource"}
            </button>
          </form>
        </section>

        {/* RESOURCES */}
        <section>
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Uploaded Resources
          </h2>

          {resources.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
              No resources uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                    {resource.type === "question_paper"
                      ? "Question Paper"
                      : "Note"}
                  </p>

                  <h3 className="mb-3 line-clamp-2 font-semibold text-gray-900">
                    {resource.title}
                  </h3>

                  <p className="text-sm text-gray-600">
                    Year {resource.year}
                  </p>

                  <p className="text-sm text-gray-600">
                    Semester {resource.semester}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}