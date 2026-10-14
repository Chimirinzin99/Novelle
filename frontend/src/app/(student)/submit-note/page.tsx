
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  STUDENT_SUBMIT_TYPES,
  type ResourceTypeCode,
} from "@/lib/resourceTypes";

export default function SubmitNotePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceTypeCode>("note");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim() || !file) {
      setError("Please enter a title and select a PDF.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The PDF must be smaller than 10 MB.");
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

      // 3. Create safe file name
      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      // 4. Create file path
      const filePath =
        "submissions/" +
        user.id +
        "/" +
        Date.now() +
        "-" +
        safeFileName;

      // 5. Upload PDF to Storage
      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("STORAGE ERROR:", uploadError);
        setError("Storage error: " + uploadError.message);
        return;
      }

      // 6. Insert submission into database
      const { error: submissionError } = await supabase
        .from("resource_submissions")
        .insert({
          title: title.trim(),
          type,
          programme_id: profile.programme_id,
          file_path: filePath,
          submitted_by: user.id,
          status: "pending",
        });

      if (submissionError) {
        console.error("DATABASE ERROR:", submissionError);

        // Remove uploaded file if database insert fails
        await supabase.storage
          .from("resources")
          .remove([filePath]);

        setError("Database error: " + submissionError.message);
        return;
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

      // Show submission on My Submissions
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
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        {/* Page introduction */}
        <div className="mb-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9E3F1] bg-[#E7EEF8] px-3 py-1.5 text-xs font-semibold text-[#294C78]">
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

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Share your study materials with fellow students. Your
            submission will be reviewed by an admin before appearing
            on Novelle.
          </p>
        </div>

        {/* Upload form card */}
        <div className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white shadow-sm">
          <div className="border-b border-[#E7E5DF] bg-[#FAFAF7] px-6 py-5 sm:px-8">
            <h2 className="text-base font-semibold text-[#24344D]">
              Resource details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a title, choose the resource type, and attach your PDF.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-6 sm:p-8"
          >
            {/* Title */}
            <div>
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
                className="w-full rounded-xl border border-[#DCDDD8] bg-white px-4 py-3 text-sm text-[#24344D] outline-none transition placeholder:text-slate-400 hover:border-[#C8D5E7] focus:border-[#456FAD] focus:ring-4 focus:ring-[#E7EEF8] disabled:cursor-not-allowed disabled:bg-gray-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Use a clear title so students can find your resource easily.
              </p>
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
            <div>
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
                    : "border-[#D9DEE7] bg-[#FAFBFD] hover:border-[#A9C2E2] hover:bg-[#F5F8FD]"
                } ${loading ? "pointer-events-none opacity-60" : ""}`}
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
                      Click to upload your PDF
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Select a file from your computer
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
                    const selectedFile = e.target.files?.[0] || null;

                    setFile(selectedFile);
                    setError("");
                    setMessage("");
                  }}
                  disabled={loading}
                  required={!file}
                  className="sr-only"
                />
              </label>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>PDF format only</span>
                <span>Maximum file size: 10 MB</span>
              </div>
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
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#294C78] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203B60] focus:outline-none focus:ring-4 focus:ring-[#E7EEF8] disabled:cursor-not-allowed disabled:opacity-60"
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

            <p className="text-center text-xs text-slate-400">
              By submitting, you confirm that this resource is suitable
              for sharing with students.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
