"use client";

// /submit-note — a student submits a PDF (note, question paper or assignment)
// for their own programme; a programme admin reviews it.
// Part 12: new layout — one column in the order a student fills it in
// (what type -> title -> PDF -> submit). The old two-column layout hid the
// Submit button below the screen on laptops (the page could not scroll).
// The submit code is unchanged.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { addNotification } from "@/lib/notifications";
import {
  STUDENT_SUBMIT_TYPES,
  resourceTypeBadge,
  type ResourceTypeCode,
} from "@/lib/resourceTypes";
import PageHeader from "@/components/PageHeader";

// Longest title the backend accepts.
const TITLE_MAX = 120;

// One line under each type choice, so students pick the right one.
const TYPE_HINTS: Record<string, string> = {
  note: "Lecture or study notes",
  question_paper: "A past exam or test paper",
  assignment: "An assignment or coursework sheet",
};

// "1.4 MB" / "830 KB"
function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

      const response = await callBackend(`${BACKEND_URL}/api/submissions/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await readJson(response);
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

  const inputClass =
    "h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink-soft focus:border-navy-soft focus:ring-4 focus:ring-sky-tint disabled:cursor-not-allowed disabled:bg-sky-wash";
  const stepLabel = "mb-2 block font-display text-base font-bold text-navy";

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow="Upload"
          title="Submit a resource"
          description="Share study material with your programme. An admin reviews it before it appears on Novelle."
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-7 rounded-2xl border border-line bg-white p-5 sm:p-7">
          {/* 1. Type — three big choices instead of a dropdown, so all
                 options are visible at once. They are real radio buttons
                 (keyboard: Tab to the group, arrow keys to choose). */}
          <fieldset disabled={loading}>
            <legend className={stepLabel}>1. What are you sharing?</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {STUDENT_SUBMIT_TYPES.map((t) => {
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
                      onChange={() => setType(t.code)}
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

          {/* 2. Title */}
          <div>
            <label htmlFor="note-title" className={stepLabel}>
              2. Title
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Programming — Unit 3 notes"
              disabled={loading}
              required
              maxLength={TITLE_MAX}
              aria-describedby="title-help"
              className={inputClass}
            />
            <p id="title-help" className="mt-1.5 flex justify-between gap-3 text-sm text-ink-soft">
              <span>A clear title helps other students find it.</span>
              <span aria-live="polite">
                {title.length}/{TITLE_MAX}
              </span>
            </p>
          </div>

          {/* 3. PDF — drop zone until a file is chosen, then a file row */}
          <div>
            <p id="pdf-label" className={stepLabel}>
              3. PDF file
            </p>

            {/* The real file input, hidden; the drop zone below is its label. */}
            <input
              id="pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => selectFile(e.target.files?.[0] || null)}
              disabled={loading}
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
                  disabled={loading}
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
                <svg viewBox="0 0 24 24" className="mb-1 h-8 w-8 text-navy" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
                </svg>
                <span className="font-bold text-ink">Drop your PDF here, or click to choose</span>
                <span className="text-sm text-ink-soft">PDF only · 5 MB maximum</span>
              </label>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {message}
            </p>
          )}

          {/* What happens next + the buttons */}
          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-navy-soft" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              It stays pending until an admin of your programme reviews it. You can follow it on My Submissions.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={clearForm}
                disabled={loading}
                className="h-12 rounded-xl border-[1.5px] border-sky-line bg-white px-5 text-[15px] font-semibold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40 disabled:opacity-60"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-xl bg-navy px-6 font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}