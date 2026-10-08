"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RESOURCE_TYPES, type ResourceTypeCode } from "@/lib/resourceTypes";

export default function SubmitNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  // Chosen resource type; starts as "note".
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

        setError(
          "Storage error: " +
            uploadError.message
        );

        return;
      }

      // 6. Insert submission into database
      const { error: submissionError } = await supabase
        .from("resource_submissions")
        .insert({
          title: title.trim(),
          type, // the type the student picked
          programme_id: profile.programme_id,
          file_path: filePath,
          submitted_by: user.id,
          status: "pending",
        });

      if (submissionError) {
        console.error(
          "DATABASE ERROR:",
          submissionError
        );

        // Remove uploaded file if database insert fails
        await supabase.storage
          .from("resources")
          .remove([filePath]);

        setError(
          "Database error: " +
            submissionError.message
        );

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

      // Show the new submission (as "Pending") on My Submissions.
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
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Submit a Resource
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Submit your PDF for admin review. Approved resources
            will appear on Novelle.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Title */}
          <div>
            <label
              htmlFor="note-title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Title
            </label>

            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Enter a title"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100"
            />
          </div>

          {/* Type (options come from lib/resourceTypes.ts) */}
          <div>
            <label
              htmlFor="resource-type"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Type
            </label>

            <select
              id="resource-type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as ResourceTypeCode)
              }
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* PDF */}
          <div>
            <label
              htmlFor="pdf-file"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              PDF File
            </label>

            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const selectedFile =
                  e.target.files?.[0] || null;

                setFile(selectedFile);
                setError("");
                setMessage("");
              }}
              disabled={loading}
              className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              PDF only. Maximum file size: 10 MB.
            </p>

            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected:{" "}
                <span className="font-medium text-gray-900">
                  {file.name}
                </span>
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : "Submit for Review"}
          </button>
        </form>
      </div>
    </main>
  );
}