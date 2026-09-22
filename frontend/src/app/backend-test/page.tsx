"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BackendTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const uploadFile = async () => {
    setLoading(true);
    setResult("");

    try {
      // ------------------------------------
      // Check PDF
      // ------------------------------------

      if (!file) {
        setResult("Please select a PDF file first.");
        return;
      }

      if (file.type !== "application/pdf") {
        setResult("Only PDF files are allowed.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setResult("PDF file must be 10 MB or smaller.");
        return;
      }

      // ------------------------------------
      // Get logged-in user session
      // ------------------------------------

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setResult("No logged-in user found.");
        return;
      }

      // ------------------------------------
      // Create FormData
      // ------------------------------------

      const formData = new FormData();

      formData.append("file", file);

      formData.append(
        "title",
        "Combined Backend Test Resource"
      );

      formData.append("type", "note");

      formData.append("module_id", "1");

      formData.append("year", "2");

      formData.append("semester", "1");

      // ------------------------------------
      // Send everything to backend
      // ------------------------------------

      const response = await fetch(
        "http://localhost:5000/api/resources/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      // ------------------------------------
      // Read backend response
      // ------------------------------------

      const responseText = await response.text();

      console.log(
        "Backend status:",
        response.status
      );

      console.log(
        "Backend response:",
        responseText
      );

      setResult(
        `Status: ${response.status}\n\n${responseText}`
      );
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      setResult(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow:
            "0 2px 10px rgba(0, 0, 0, 0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          Backend Resource Upload Test
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Test the combined PDF upload and resource
          creation endpoint.
        </p>

        {/* ------------------------------------
            Resource information
        ------------------------------------ */}

        <div
          style={{
            padding: "15px",
            marginBottom: "20px",
            backgroundColor: "#f8f8f8",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>Title:</strong>{" "}
            Combined Backend Test Resource
          </p>

          <p>
            <strong>Type:</strong> Note
          </p>

          <p>
            <strong>Module:</strong>{" "}
            CSF101 - Programming Fundamentals
          </p>

          <p>
            <strong>Year:</strong> 2
          </p>

          <p>
            <strong>Semester:</strong> 1
          </p>
        </div>

        {/* ------------------------------------
            File selection
        ------------------------------------ */}

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="pdf"
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Select PDF
          </label>

          <input
            id="pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const selectedFile =
                event.target.files?.[0] || null;

              setFile(selectedFile);
              setResult("");
            }}
          />
        </div>

        {/* ------------------------------------
            Selected file
        ------------------------------------ */}

        {file && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px",
              backgroundColor: "#f8f8f8",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>Selected file:</strong>{" "}
              {file.name}
            </p>

            <p>
              <strong>Size:</strong>{" "}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* ------------------------------------
            Upload button
        ------------------------------------ */}

        <button
          type="button"
          onClick={uploadFile}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: loading
              ? "#999"
              : "#111",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Uploading..."
            : "Upload PDF"}
        </button>

        {/* ------------------------------------
            Result
        ------------------------------------ */}

        {result && (
          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              backgroundColor: "#f8f8f8",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily:
                "monospace",
              fontSize: "13px",
            }}
          >
            {result}
          </div>
        )}
      </div>
    </main>
  );
}