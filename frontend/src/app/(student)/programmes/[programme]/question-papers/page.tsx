
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FilterBar from "@/components/FilterBar";
import { supabase } from "@/lib/supabase";
import { findProgramme } from "@/lib/programme";

type QuestionPaper = {
  id: number;
  topic: string;
  year: number;
  semester: number;
  module_name: string;
  file_path: string | null;
};

export default function QuestionPapersPage() {
  const params = useParams();

  const programmeSlug = decodeURIComponent(
    params.programme as string
  );

  const [programmeName, setProgrammeName] = useState("");

  const [questionPapers, setQuestionPapers] = useState<
    QuestionPaper[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] =
    useState("All Years");

  const [selectedSemester, setSelectedSemester] =
    useState("All Semesters");

  const [selectedModule, setSelectedModule] =
    useState("All Modules");

  useEffect(() => {
    fetchQuestionPapers();
  }, [programmeSlug]);

  async function fetchQuestionPapers() {
    setLoading(true);
    setError("");

    // -----------------------------------------
    // Find programme
    // -----------------------------------------

    const {
      data: programmeData,
      error: programmeError,
    } = await findProgramme(programmeSlug);

    if (programmeError || !programmeData) {
      console.error(
        "Programme error:",
        programmeError
      );

      setError(
        `Unable to find programme "${programmeSlug}".`
      );

      setLoading(false);
      return;
    }

    setProgrammeName(programmeData.name);

    // -----------------------------------------
    // Get question papers
    // -----------------------------------------

    const { data, error: papersError } =
      await supabase
        .from("resources")
        .select(
          "id, topic, year, semester, module_name, file_path, type, programme_id"
        )
        .eq("programme_id", programmeData.id)
        .eq("type", "question_paper")
        .order("created_at", {
          ascending: false,
        });

    if (papersError) {
      console.error(
        "Question papers error:",
        papersError
      );

      setError(
        "Unable to load question papers."
      );

      setLoading(false);
      return;
    }

    const formattedPapers: QuestionPaper[] =
      (data || []).map((item: any) => ({
        id: item.id,
        topic:
          item.topic ||
          item.title ||
          "Untitled Question Paper",
        year: item.year,
        semester: item.semester,
        module_name:
          item.module_name ||
          "Unknown Module",
        file_path: item.file_path,
      }));

    setQuestionPapers(formattedPapers);

    setLoading(false);
  }

  // -----------------------------------------
  // Module dropdown options
  // -----------------------------------------

  const modules = [
    ...new Set(
      questionPapers.map(
        (paper) => paper.module_name
      )
    ),
  ];

  // -----------------------------------------
  // Filtering
  // -----------------------------------------

  const filteredPapers =
    questionPapers.filter((paper) => {
      const yearMatches =
        selectedYear === "All Years" ||
        paper.year?.toString() ===
          selectedYear.replace("Year ", "");

      const semesterMatches =
        selectedSemester === "All Semesters" ||
        paper.semester?.toString() ===
          selectedSemester.replace(
            "Semester ",
            ""
          );

      const moduleMatches =
        selectedModule === "All Modules" ||
        paper.module_name === selectedModule;

      return (
        yearMatches &&
        semesterMatches &&
        moduleMatches
      );
    });

  // -----------------------------------------
  // Clear filters
  // -----------------------------------------

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  // -----------------------------------------
  // View question paper
  // -----------------------------------------

  async function handleViewPaper(
    filePath: string | null
  ) {
    if (!filePath) {
      setError(
        "This question paper does not have a file."
      );
      return;
    }

    const { data, error } =
      await supabase.storage
        .from("resources")
        .createSignedUrl(
          filePath,
          3600
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      console.error(
        "View error:",
        error
      );

      setError(
        "Unable to open this question paper."
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank"
    );
  }

  // -----------------------------------------
  // Download question paper
  // -----------------------------------------

  async function handleDownloadPaper(
    filePath: string | null
  ) {
    if (!filePath) {
      setError(
        "This question paper does not have a file."
      );
      return;
    }

    const { data, error } =
      await supabase.storage
        .from("resources")
        .createSignedUrl(
          filePath,
          3600,
          {
            download: true,
          }
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      console.error(
        "Download error:",
        error
      );

      setError(
        "Unable to download this question paper."
      );

      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.href =
      data.signedUrl;

    link.download = "";
    link.target = "_blank";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  }

  return (
    <main className="min-h-full bg-gray-100 p-8">

      {/* Back Button */}
      <Link
        href={`/programmes/${encodeURIComponent(
          programmeSlug
        )}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">
          {programmeName ||
            programmeSlug}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Question Papers
        </h1>

        <p className="mt-2 text-gray-500">
          Browse approved past question
          papers by year, semester, and
          module.
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        year={selectedYear}
        onYearChange={
          setSelectedYear
        }
        semester={
          selectedSemester
        }
        onSemesterChange={
          setSelectedSemester
        }
        modules={modules}
        module={
          selectedModule
        }
        onModuleChange={
          setSelectedModule
        }
        onClear={
          clearFilters
        }
      />

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            Loading question
            papers...
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <section>

          {/* Results Header */}
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Available Question
              Papers
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {
                filteredPapers.length
              }{" "}
              {filteredPapers.length ===
              1
                ? "paper"
                : "papers"}{" "}
              found
            </p>
          </div>

          {/* Question Paper Cards */}
          {filteredPapers.length >
          0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {filteredPapers.map(
                (paper) => (
                  <div
                    key={
                      paper.id
                    }
                    className="flex min-h-[250px] flex-col rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >

                    {/* Paper Icon */}
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                      📄
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900">
                      {
                        paper.topic
                      }
                    </h3>

                    {/* Academic Information */}
                    <p className="mt-2 text-sm text-gray-500">
                      Year{" "}
                      {
                        paper.year
                      }{" "}
                      ·{" "}
                      Semester{" "}
                      {
                        paper.semester
                      }
                    </p>

                    {/* Module */}
                    <p className="mt-1 text-xs text-gray-400">
                      {
                        paper.module_name
                      }
                    </p>

                    {/* Buttons */}
                    <div className="mt-auto flex gap-2 pt-5">

                      {/* View */}
                      <button
                        onClick={() =>
                          handleViewPaper(
                            paper.file_path
                          )
                        }
                        className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700"
                      >
                        View
                      </button>

                      {/* Download */}
                      <button
                        onClick={() =>
                          handleDownloadPaper(
                            paper.file_path
                          )
                        }
                        className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                        title="Download"
                      >
                        ↓
                      </button>

                    </div>
                  </div>
                )
              )}

            </div>
          ) : (

            /* No Results */
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">

              <div className="mb-4 text-4xl">
                📄
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                No question
                papers found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing
                your filters or
                check back later.
              </p>

              <button
                onClick={
                  clearFilters
                }
                className="mt-5 rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Clear Filters
              </button>

            </div>
          )}

        </section>
      )}

    </main>
  );
}

