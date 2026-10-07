
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import FilterBar from "@/components/FilterBar";

type QuestionPaper = {
  id: number;
  title: string;
  year: string;
  semester: string;
  module: string;
  examYear: string;
};

export default function QuestionPapersPage() {
  const params = useParams();

  const programme = decodeURIComponent(params.programme as string);

  const programmeName = programme
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  // -----------------------------
  // Filter states
  // -----------------------------

  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] =
    useState("All Semesters");
  const [selectedModule, setSelectedModule] =
    useState("All Modules");

  // -----------------------------
  // Temporary question paper data
  // Later this will come from Supabase
  // -----------------------------

  const questionPapers: QuestionPaper[] = [
    {
      id: 1,
      title: "Programming Final Examination",
      year: "Year 1",
      semester: "Semester 1",
      module: "Programming",
      examYear: "2025",
    },
    {
      id: 2,
      title: "Database Systems Final Examination",
      year: "Year 1",
      semester: "Semester 2",
      module: "Database Systems",
      examYear: "2025",
    },
    {
      id: 3,
      title: "Software Engineering Final Examination",
      year: "Year 2",
      semester: "Semester 1",
      module: "Software Engineering",
      examYear: "2025",
    },
    {
      id: 4,
      title: "Computer Networks Final Examination",
      year: "Year 2",
      semester: "Semester 2",
      module: "Computer Networks",
      examYear: "2024",
    },
    {
      id: 5,
      title: "Data Structures Final Examination",
      year: "Year 2",
      semester: "Semester 1",
      module: "Programming",
      examYear: "2024",
    },
    {
      id: 6,
      title: "Web Development Final Examination",
      year: "Year 3",
      semester: "Semester 1",
      module: "Web Development",
      examYear: "2025",
    },
    {
      id: 7,
      title: "Software Testing Final Examination",
      year: "Year 3",
      semester: "Semester 2",
      module: "Software Engineering",
      examYear: "2024",
    },
    {
      id: 8,
      title: "Software Project Management Final Examination",
      year: "Year 4",
      semester: "Semester 1",
      module: "Software Engineering",
      examYear: "2023",
    },
  ];

  // Module dropdown options, taken from the data itself.
  // new Set(...) removes duplicates; [...] turns it back into an array.
  const modules = [...new Set(questionPapers.map((item) => item.module))];

  // -----------------------------
  // Filtering
  // -----------------------------

  const filteredPapers = questionPapers.filter((paper) => {
    const yearMatches =
      selectedYear === "All Years" ||
      paper.year === selectedYear;

    const semesterMatches =
      selectedSemester === "All Semesters" ||
      paper.semester === selectedSemester;

    const moduleMatches =
      selectedModule === "All Modules" ||
      paper.module === selectedModule;

    return yearMatches && semesterMatches && moduleMatches;
  });

  // -----------------------------
  // Clear filters
  // -----------------------------

  const clearFilters = () => {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  };

  return (
    <main className="min-h-full bg-gray-100 p-8">

      {/* Back Button */}
      <Link
        href={`/programmes/${encodeURIComponent(programme)}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Question Papers
        </h1>

        <p className="mt-2 text-gray-500">
          Browse {programmeName} past question papers by year,
          semester, and module.
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        year={selectedYear}
        onYearChange={setSelectedYear}
        semester={selectedSemester}
        onSemesterChange={setSelectedSemester}
        modules={modules}
        module={selectedModule}
        onModuleChange={setSelectedModule}
        onClear={clearFilters}
      />

        {/* ================================================= */}
        {/* QUESTION PAPERS */}
        {/* ================================================= */}

        <section>

          {/* Results Header */}
          <div className="mb-5">

            <h2 className="text-xl font-semibold text-gray-900">
              Available Question Papers
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredPapers.length}{" "}
              {filteredPapers.length === 1
                ? "paper"
                : "papers"}{" "}
              found
            </p>

          </div>

          {/* ================================================= */}
          {/* PAPER CARDS */}
          {/* ================================================= */}

          {filteredPapers.length > 0 ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {filteredPapers.map((paper) => (

                <div
                  key={paper.id}
                  className="rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* Paper Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                    📄
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900">
                    {paper.title}
                  </h3>

                  {/* Academic Information */}
                  <p className="mt-2 text-sm text-gray-500">
                    {paper.year} · {paper.semester}
                  </p>

                  {/* Module */}
                  <p className="mt-1 text-xs text-gray-400">
                    {paper.module}
                  </p>

                  {/* Exam Year */}
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Exam: {paper.examYear}
                  </p>

                  {/* Buttons */}
                  <div className="mt-5 flex gap-2">

                    <button className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700">
                      View
                    </button>

                    <button className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-200">
                      ↓
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            /* No Results */
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">

              <div className="mb-4 text-4xl">
                📄
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                No question papers found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing your filters to find available
                question papers.
              </p>

              <button
                onClick={clearFilters}
                className="mt-5 rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Clear Filters
              </button>

            </div>

          )}

        </section>

    </main>
  );
}