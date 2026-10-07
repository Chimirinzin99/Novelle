
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import FilterBar from "@/components/FilterBar";

type Assignment = {
  id: number;
  title: string;
  year: string;
  semester: string;
  module: string;
  dueDate: string;
};

export default function AssignmentsPage() {
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
  // Temporary assignment data
  // Later this will come from Supabase
  // -----------------------------

  const assignments: Assignment[] = [
    {
      id: 1,
      title: "C Programming Assignment",
      year: "Year 1",
      semester: "Semester 1",
      module: "Programming",
      dueDate: "10 October 2026",
    },
    {
      id: 2,
      title: "Database Design Assignment",
      year: "Year 1",
      semester: "Semester 2",
      module: "Database Systems",
      dueDate: "18 October 2026",
    },
    {
      id: 3,
      title: "Software Design Assignment",
      year: "Year 2",
      semester: "Semester 1",
      module: "Software Engineering",
      dueDate: "22 October 2026",
    },
    {
      id: 4,
      title: "Network Configuration Assignment",
      year: "Year 2",
      semester: "Semester 2",
      module: "Computer Networks",
      dueDate: "25 October 2026",
    },
    {
      id: 5,
      title: "Data Structures Assignment",
      year: "Year 2",
      semester: "Semester 1",
      module: "Programming",
      dueDate: "30 October 2026",
    },
    {
      id: 6,
      title: "Web Development Project",
      year: "Year 3",
      semester: "Semester 1",
      module: "Web Development",
      dueDate: "5 November 2026",
    },
    {
      id: 7,
      title: "Software Testing Assignment",
      year: "Year 3",
      semester: "Semester 2",
      module: "Software Engineering",
      dueDate: "12 November 2026",
    },
    {
      id: 8,
      title: "Software Project Assignment",
      year: "Year 4",
      semester: "Semester 1",
      module: "Software Engineering",
      dueDate: "20 November 2026",
    },
  ];

  // Module dropdown options, taken from the data itself.
  // new Set(...) removes duplicates; [...] turns it back into an array.
  const modules = [...new Set(assignments.map((item) => item.module))];

  // -----------------------------
  // Filtering
  // -----------------------------

  const filteredAssignments = assignments.filter((assignment) => {
    const yearMatches =
      selectedYear === "All Years" ||
      assignment.year === selectedYear;

    const semesterMatches =
      selectedSemester === "All Semesters" ||
      assignment.semester === selectedSemester;

    const moduleMatches =
      selectedModule === "All Modules" ||
      assignment.module === selectedModule;

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
          Assignments
        </h1>

        <p className="mt-2 text-gray-500">
          Browse {programmeName} assignments by year, semester,
          and module.
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
        {/* ASSIGNMENTS */}
        {/* ================================================= */}

        <section>

          {/* Results Header */}
          <div className="mb-5">

            <h2 className="text-xl font-semibold text-gray-900">
              Available Assignments
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredAssignments.length}{" "}
              {filteredAssignments.length === 1
                ? "assignment"
                : "assignments"}{" "}
              found
            </p>

          </div>

          {/* ================================================= */}
          {/* ASSIGNMENT CARDS */}
          {/* ================================================= */}

          {filteredAssignments.length > 0 ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {filteredAssignments.map((assignment) => (

                <div
                  key={assignment.id}
                  className="rounded-xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* Assignment Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                    📝
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900">
                    {assignment.title}
                  </h3>

                  {/* Year + Semester */}
                  <p className="mt-2 text-sm text-gray-500">
                    {assignment.year} · {assignment.semester}
                  </p>

                  {/* Module */}
                  <p className="mt-1 text-xs text-gray-400">
                    {assignment.module}
                  </p>

                  {/* Due Date */}
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Due: {assignment.dueDate}
                  </p>

                  {/* Buttons */}
                  <div className="mt-5 flex gap-2">

                    <button className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700">
                      View
                    </button>

                    <button
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-200"
                      aria-label="Like assignment"
                    >
                      ♡
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            /* No Results */
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">

              <div className="mb-4 text-4xl">
                📝
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                No assignments found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing your filters to find available
                assignments.
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

