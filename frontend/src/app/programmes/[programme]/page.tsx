
"use client";

import { useState } from "react";

const programmes = {
  "civil-engineering": {
    name: "Civil Engineering",
    shortName: "Civil",
    description:
      "Explore notes and past question papers for Civil Engineering students at CST.",
    modules: ["CE101", "CE102", "CE103", "CE104"],
  },

  "electrical-engineering": {
    name: "Electrical Engineering",
    shortName: "Electrical",
    description:
      "Explore notes and past question papers for Electrical Engineering students at CST.",
    modules: ["EE101", "EE102", "EE103", "EE104"],
  },

  ece: {
    name: "Electronics and Communication Engineering",
    shortName: "ECE",
    description:
      "Explore notes and past question papers for ECE students at CST.",
    modules: ["EC101", "EC102", "EC103", "EC104"],
  },

  "information-technology": {
    name: "Information Technology",
    shortName: "IT",
    description:
      "Explore notes and past question papers for IT students at CST.",
    modules: ["IT101", "IT102", "IT103", "IT104"],
  },

  architecture: {
    name: "Architecture",
    shortName: "Architecture",
    description:
      "Explore notes and past question papers for Architecture students at CST.",
    modules: ["AR101", "AR102", "AR103", "AR104"],
  },

  "engineering-geology": {
    name: "Engineering Geology",
    shortName: "Geology",
    description:
      "Explore notes and past question papers for Engineering Geology students at CST.",
    modules: ["EG101", "EG102", "EG103", "EG104"],
  },

  "instrumentation-and-control-engineering": {
    name: "Instrumentation and Control Engineering",
    shortName: "ICE",
    description:
      "Explore notes and past question papers for ICE students at CST.",
    modules: ["ICE101", "ICE102", "ICE103", "ICE104"],
  },

  "water-resources-engineering": {
    name: "Water Resources Engineering",
    shortName: "WRE",
    description:
      "Explore notes and past question papers for WRE students at CST.",
    modules: ["WRE101", "WRE102", "WRE103", "WRE104"],
  },

  "mechanical-engineering": {
    name: "Mechanical Engineering",
    shortName: "Mechanical",
    description:
      "Explore notes and past question papers for Mechanical Engineering students at CST.",
    modules: ["ME101", "ME102", "ME103", "ME104"],
  },

  "software-engineering": {
    name: "Software Engineering",
    shortName: "Software",
    description:
      "Explore notes and past question papers for Software Engineering students at CST.",
    modules: ["SE101", "SE102", "SE103", "SE104"],
  },
};

type ProgrammeSlug = keyof typeof programmes;

type Resource = {
  id: number;
  title: string;
  type: "Note" | "Past Paper";
  year: string;
  semester: string;
  module: string;
  description: string;
};

const resources: Resource[] = [
  // Civil Engineering
  {
    id: 1,
    title: "Engineering Mathematics I",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "CE101",
    description: "Study notes for Engineering Mathematics I.",
  },
  {
    id: 2,
    title: "Engineering Mathematics I - 2025",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 1",
    module: "CE101",
    description: "Previous examination paper.",
  },
  {
    id: 3,
    title: "Engineering Mechanics",
    type: "Note",
    year: "Year 1",
    semester: "Semester 2",
    module: "CE102",
    description: "Study notes for Engineering Mechanics.",
  },
  {
    id: 4,
    title: "Engineering Mechanics - 2024",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 2",
    module: "CE102",
    description: "Previous examination paper.",
  },
  {
    id: 5,
    title: "Structural Analysis",
    type: "Note",
    year: "Year 2",
    semester: "Semester 1",
    module: "CE103",
    description: "Study notes for Structural Analysis.",
  },
  {
    id: 6,
    title: "Structural Analysis - 2025",
    type: "Past Paper",
    year: "Year 2",
    semester: "Semester 1",
    module: "CE103",
    description: "Previous examination paper.",
  },

  // Electrical Engineering
  {
    id: 7,
    title: "Circuit Theory",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "EE101",
    description: "Study notes for Circuit Theory.",
  },
  {
    id: 8,
    title: "Circuit Theory - 2025",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 1",
    module: "EE101",
    description: "Previous examination paper.",
  },

  // ECE
  {
    id: 9,
    title: "Digital Electronics",
    type: "Note",
    year: "Year 1",
    semester: "Semester 2",
    module: "EC101",
    description: "Study notes for Digital Electronics.",
  },
  {
    id: 10,
    title: "Digital Electronics - 2025",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 2",
    module: "EC101",
    description: "Previous examination paper.",
  },

  // IT
  {
    id: 11,
    title: "Programming Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "IT101",
    description: "Study notes for Programming Fundamentals.",
  },
  {
    id: 12,
    title: "Programming Fundamentals - 2025",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 1",
    module: "IT101",
    description: "Previous examination paper.",
  },

  // Architecture
  {
    id: 13,
    title: "Architectural Design",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "AR101",
    description: "Study notes for Architectural Design.",
  },

  // Engineering Geology
  {
    id: 14,
    title: "Geology Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "EG101",
    description: "Study notes for Geology Fundamentals.",
  },

  // ICE
  {
    id: 15,
    title: "Instrumentation Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "ICE101",
    description: "Study notes for Instrumentation Fundamentals.",
  },

  // WRE
  {
    id: 16,
    title: "Water Resources Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "WRE101",
    description: "Study notes for Water Resources Fundamentals.",
  },

  // Mechanical
  {
    id: 17,
    title: "Engineering Mechanics",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "ME101",
    description: "Study notes for Engineering Mechanics.",
  },

  // Software Engineering
  {
    id: 18,
    title: "Programming Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 1",
    module: "SE101",
    description: "Study notes for Programming Fundamentals.",
  },
  {
    id: 19,
    title: "Programming Fundamentals - 2025",
    type: "Past Paper",
    year: "Year 1",
    semester: "Semester 1",
    module: "SE101",
    description: "Previous examination paper.",
  },
  {
    id: 20,
    title: "Database Fundamentals",
    type: "Note",
    year: "Year 1",
    semester: "Semester 2",
    module: "SE102",
    description: "Study notes for Database Fundamentals.",
  },
];

export default function ProgrammePage() {
  const [selectedYear, setSelectedYear] = useState("Year 1");
  const [selectedSemester, setSelectedSemester] = useState("All");
  const [selectedModule, setSelectedModule] = useState("All");

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const programmeSlug = pathname.split("/").filter(Boolean).pop() || "";

  const data = programmes[programmeSlug as ProgrammeSlug];

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Programme Not Found
          </h1>

          <a
  href="/"
  className="absolute left-6 top-6 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
>
  ← Back
</a>
        </div>
      </main>
    );
  }

  const filteredResources = resources.filter((resource) => {
    const correctProgramme =
      resource.module.startsWith(data.shortName === "ECE" ? "EC" : data.shortName === "Geology" ? "EG" : data.shortName);

    const correctYear =
      selectedYear === "All" || resource.year === selectedYear;

    const correctSemester =
      selectedSemester === "All" ||
      resource.semester === selectedSemester;

    const correctModule =
      selectedModule === "All" ||
      resource.module === selectedModule;

    return (
      correctProgramme &&
      correctYear &&
      correctSemester &&
      correctModule
    );
  });

  const notes = filteredResources.filter(
    (resource) => resource.type === "Note",
  );

  const pastPapers = filteredResources.filter(
    (resource) => resource.type === "Past Paper",
  );

  return (
    <main className="min-h-screen bg-gray-100">
      {/* TOP BAR */}
      ```tsx
<header className="border-b bg-white">
  <div className="relative mx-auto max-w-7xl px-6 py-4">

    <button
      onClick={() => window.history.back()}
      className="absolute left-6 top-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      ← Back
    </button>

    <div className="ml-28">
      <a
        href="/"
        className="text-2xl font-bold text-blue-600"
      >
        Novelle
      </a>

      <p className="text-xs text-gray-500">
        CST Student Platform
      </p>
    </div>

  </div>
</header>
```


      {/* PROGRAMME HEADER */}
      <section className="border-b bg-white px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-blue-600">
            CST Programme
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {data.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            {data.description}
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="px-6 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[230px_1fr]">

          {/* LEFT SIDEBAR */}
          <aside className="h-fit rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Resources
            </h2>

            {/* YEARS */}
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Year
              </h3>

              <div className="space-y-1">
                {["Year 1", "Year 2", "Year 3", "Year 4"].map(
                  (year) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setSelectedModule("All");
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        selectedYear === year
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {year}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* SEMESTER */}
            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Semester
              </h3>

              <div className="space-y-1">
                {["All", "Semester 1", "Semester 2"].map(
                  (semester) => (
                    <button
                      key={semester}
                      onClick={() => setSelectedSemester(semester)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        selectedSemester === semester
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {semester}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* MODULES */}
            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Module
              </h3>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedModule("All")}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selectedModule === "All"
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  All Modules
                </button>

                {data.modules.map((module) => (
                  <button
                    key={module}
                    onClick={() => setSelectedModule(module)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedModule === module
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {module}
                  </button>
                ))}
              </div>
            </div>

            {/* CLEAR */}
            <button
              onClick={() => {
                setSelectedYear("Year 1");
                setSelectedSemester("All");
                setSelectedModule("All");
              }}
              className="mt-6 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </aside>

          {/* MAIN CONTENT */}
          <div>
            {/* ACTIVE FILTER */}
            <div className="mb-6 rounded-xl border bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Currently viewing
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {selectedYear}
                </span>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {selectedSemester}
                </span>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {selectedModule}
                </span>
              </div>
            </div>

            {/* NOTES */}
            <section className="rounded-2xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Notes
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Notes for {selectedYear}
                  </p>
                </div>

                <span className="text-sm text-gray-400">
                  {notes.length} resources
                </span>
              </div>

              {notes.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border p-5 hover:border-blue-200 hover:shadow-sm"
                    >
                      <span className="text-xs font-medium text-blue-600">
                        {note.module}
                      </span>

                      <h3 className="mt-3 font-semibold text-gray-900">
                        {note.title}
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-gray-500">
                        {note.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <span className="text-xs text-gray-400">
                          {note.semester}
                        </span>

                        <button className="text-sm font-medium text-blue-600 hover:underline">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm font-medium text-gray-600">
                    No notes found
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Try another year, semester or module.
                  </p>
                </div>
              )}
            </section>

            {/* PAST QUESTION PAPERS */}
            <section className="mt-6 rounded-2xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Past Question Papers
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Previous examination papers for {selectedYear}
                  </p>
                </div>

                <span className="text-sm text-gray-400">
                  {pastPapers.length} papers
                </span>
              </div>

              {pastPapers.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {pastPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between rounded-xl border p-4 hover:bg-gray-50"
                    >
                      <div>
                        <span className="text-xs font-medium text-blue-600">
                          {paper.module}
                        </span>

                        <h3 className="mt-1 font-medium text-gray-900">
                          {paper.title}
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          {paper.semester}
                        </p>
                      </div>

                      <button className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm font-medium text-gray-600">
                    No past question papers found
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    There are no question papers for the selected filters yet.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

