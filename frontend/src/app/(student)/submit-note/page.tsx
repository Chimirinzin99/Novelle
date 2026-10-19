
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { addNotification } from "@/lib/notifications";
import {
  STUDENT_SUBMIT_TYPES,
  type ResourceTypeCode,
} from "@/lib/resourceTypes";

export default function SubmitNotePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceTypeCode>("note");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function selectFile(selectedFile: File | null) {
    setError("");
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setError("That file is not a PDF. Choose a .pdf file to continue.");
      clearFileInput();
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("That file is larger than 5 MB. Choose a smaller PDF.");
      clearFileInput();
      return;
    }

    setFile(selectedFile);
  }

  function clearFileInput() {
    const fileInput = document.getElementById(
      "pdf-file"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function removeFile() {
    setFile(null);
    setError("");
    setMessage("");
    clearFileInput();
  }

  function clearForm() {
    setTitle("");
    setType("note");
    setFile(null);
    setError("");
    setMessage("");
    clearFileInput();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim() || !file) {
      setError("Please enter a title and select a PDF.");
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The PDF must be 5 MB or smaller.");
      return;
    }

    setLoading(true);

    try {
      // 1. Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in to submit.");
        return;
      }

      // 2. Get student's programme
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, programme_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error("Profile error: " + profileError.message);
      }

      if (!profile) {
        throw new Error(
          "Your profile was not found. Please check the profiles table in Supabase."
        );
      }

      if (!profile.programme_id) {
        throw new Error(
          "Your profile does not have a programme assigned."
        );
      }

      // Submit through the backend so the 5 MB limit is enforced server-side.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("type", type);
      formData.append("file", file);

      const response = await fetch(`${BACKEND_URL}/api/submissions/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to submit the resource.");
      }

      // 7. Clear form
      setTitle("");
      setType("note");
      setFile(null);

      const fileInput = document.getElementById(
        "pdf-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      addNotification(
        "Your resource submission is pending admin review.",
        "/my-submissions"
      );

      // Show a one-time confirmation after navigating to My Submissions.
      sessionStorage.setItem(
        "novelle:upload-notice",
        "Resource submitted successfully. It is now pending admin review."
      );

      router.push("/my-submissions");
    } catch (err) {
      console.error("SUBMIT ERROR:", err);

      if (err && typeof err === "object") {
        const supabaseError = err as {
          message?: string;
          details?: string;
          hint?: string;
        };

        setError(
          "Error: " +
            (supabaseError.message ||
              supabaseError.details ||
              "Unknown error")
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-full bg-[#FCFBF8] px-4 py-4 sm:px-6 sm:py-5 xl:h-full xl:min-h-0 xl:overflow-hidden">
      <div className="mx-auto flex min-h-full max-w-none flex-col xl:h-full xl:min-h-0">
        {/* Page introduction */}
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D9E3F1] bg-[#E7EEF8] px-3 py-1.5 text-xs font-semibold text-[#294C78]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
              />
            </svg>
            Contribute to your programme
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#24344D] sm:text-3xl">
              Submit a Resource
            </h1>

            <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
              Share study materials with your programme. An admin will review
              your submission before it appears on Novelle.
            </p>
          </div>
        </div>

        {/* Upload form card */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-sm">
          <div className="shrink-0 border-b border-[#E7E5DF] bg-[#FAFAF7] px-5 py-3 sm:px-7">
            <h2 className="text-base font-semibold text-[#24344D]">
              Resource details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a title, choose the resource type, and attach your PDF.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 p-4 sm:p-5 xl:flex-1 xl:grid-cols-2 xl:content-between xl:overflow-y-auto xl:p-6"
          >
            {/* Title */}
            <div className="xl:col-span-2">
              <label
                htmlFor="note-title"
                className="mb-2 block text-sm font-semibold text-[#24344D]"
              >
                Resource title
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="note-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Programming"
                disabled={loading}
                required
                maxLength={120}
                aria-describedby="title-help title-count"
                className="w-full rounded-xl border border-[#DCDDD8] bg-white px-4 py-3 text-sm text-[#24344D] outline-none transition placeholder:text-slate-400 hover:border-[#C8D5E7] focus:border-[#456FAD] focus:ring-4 focus:ring-[#E7EEF8] disabled:cursor-not-allowed disabled:bg-gray-100"
              />

              <div className="mt-2 flex items-start justify-between gap-3">
                <p id="title-help" className="text-xs text-slate-500">
                  Use a clear title so students can find your resource easily.
                </p>
                <span
                  id="title-count"
                  className="shrink-0 text-xs tabular-nums text-slate-400"
                >
                  {title.length}/120
                </span>
              </div>
            </div>

            {/* Resource type */}
            <div>
              <label
                htmlFor="resource-type"
                className="mb-2 block text-sm font-semibold text-[#24344D]"
              >
                Resource type
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <select
                  id="resource-type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as ResourceTypeCode)
                  }
                  disabled={loading}
                  className="w-full appearance-none rounded-xl border border-[#DCDDD8] bg-white px-4 py-3 pr-11 text-sm text-[#24344D] outline-none transition hover:border-[#C8D5E7] focus:border-[#456FAD] focus:ring-4 focus:ring-[#E7EEF8] disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {STUDENT_SUBMIT_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Choose whether you are submitting notes, a question paper,
                or an assignment.
              </p>
            </div>

            {/* PDF upload */}
            <div className="xl:row-span-2">
              <label
                htmlFor="pdf-file"
                className="mb-2 block text-sm font-semibold text-[#24344D]"
              >
                PDF document
                <span className="ml-1 text-red-500">*</span>
              </label>

              <label
                htmlFor="pdf-file"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${
                  file
                    ? "border-[#A9C2E2] bg-[#F5F8FD]"
                    : isDragging
                      ? "border-[#456FAD] bg-[#E7EEF8]"
                      : "border-[#D9DEE7] bg-[#FAFBFD] hover:border-[#A9C2E2] hover:bg-[#F5F8FD]"
                } ${loading ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!loading) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (!loading) selectFile(e.dataTransfer.files?.[0] || null);
                }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7EEF8] text-[#294C78]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
                    />
                  </svg>
                </div>

                {file ? (
                  <>
                    <span className="max-w-full break-all text-sm font-semibold text-[#294C78]">
                      {file.name}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB ·
                      Selected successfully
                    </span>
                    <span className="mt-3 text-xs font-semibold text-[#456FAD]">
                      Choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-[#24344D]">
                      Drop your PDF here or click to browse
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Choose a file from your computer
                    </span>
                    <span className="mt-3 rounded-lg border border-[#D9DEE7] bg-white px-3 py-1.5 text-xs font-medium text-[#294C78]">
                      Browse files
                    </span>
                  </>
                )}

                <input
                  id="pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    selectFile(e.target.files?.[0] || null);
                  }}
                  disabled={loading}
                  required={!file}
                  className="sr-only"
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>PDF format</span>
                <span>5 MB maximum</span>
              </div>

              {file && (
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={loading}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 7h12m-10 0 .7 13h6.6L16 7M9 7V4h6v3m-4 4v5m2-5v5"
                    />
                  </svg>
                  Remove selected file
                </button>
              )}
            </div>

            {/* Review notice */}
            <div className="flex gap-3 rounded-xl border border-[#D9E3F1] bg-[#F5F8FD] p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="mt-0.5 h-5 w-5 shrink-0 text-[#456FAD]"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 11v5m0-8h.01"
                />
              </svg>

              <div>
                <p className="text-sm font-semibold text-[#294C78]">
                  Admin review required
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Your resource will remain pending until an admin reviews
                  it. Once approved, it can become available to students
                  in your programme.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 xl:col-span-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5 shrink-0"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v5m0 3h.01"
                  />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {/* Success */}
            {message && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 xl:col-span-2"
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col gap-3 sm:flex-row xl:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-[#294C78] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203B60] focus:outline-none focus:ring-4 focus:ring-[#E7EEF8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 animate-spin"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        fill="currentColor"
                        className="opacity-75"
                        d="M12 3a9 9 0 00-9 9h3a6 6 0 016-6V3z"
                      />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
                      />
                    </svg>
                    Submit for Review
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearForm}
                disabled={loading}
                className="rounded-xl border border-[#D9DEE7] bg-white px-5 py-3 text-sm font-semibold text-[#294C78] transition hover:bg-[#F0F4FA] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear form
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 xl:col-span-2">
              By submitting, you confirm that this resource is suitable
              for sharing with students.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
