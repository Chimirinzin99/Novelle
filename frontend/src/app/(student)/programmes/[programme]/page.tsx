"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

// The category cards, as data. Each card is drawn by the same JSX below,
// so adding a category means adding one object here.
// Tailwind only includes classes it can find written out in full in the
// code, so every colour class is spelled out (no "bg-" + colour tricks).
const CATEGORIES = [
  {
    slug: "notes",
    title: "Notes",
    description: "Find study notes and learning materials organized by module.",
    linkText: "Browse notes",
    iconBox: "bg-indigo-50 text-indigo-600",
    hoverBorder: "hover:border-indigo-300",
    linkColour: "text-indigo-600",
    iconPaths: [
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    ],
  },
  {
    slug: "question-papers",
    title: "Question Papers",
    description: "Access previous examination papers organized by year and module.",
    linkText: "Browse papers",
    iconBox: "bg-cyan-50 text-cyan-600",
    hoverBorder: "hover:border-cyan-300",
    linkColour: "text-cyan-600",
    iconPaths: [
      "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    ],
  },
  {
    slug: "assignments",
    title: "Assignments",
    description: "Find assignments and coursework for your modules.",
    linkText: "Browse assignments",
    iconBox: "bg-fuchsia-50 text-fuchsia-600",
    hoverBorder: "hover:border-fuchsia-300",
    linkColour: "text-fuchsia-600",
    iconPaths: [
      "M9 5.25h6m-7.5 3h9m-10.5 3h12m-12 3h7.5M6 3.75h12A2.25 2.25 0 0120.25 6v14.25A2.25 2.25 0 0118 22.5H6a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 016 3.75z",
    ],
  },
  {
    slug: "videos",
    title: "Videos",
    description: "Watch video lessons chosen by your programme admins.",
    linkText: "Browse videos",
    iconBox: "bg-rose-50 text-rose-600",
    hoverBorder: "hover:border-rose-300",
    linkColour: "text-rose-600",
    iconPaths: [
      "M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      "M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z",
    ],
  },
];

export default function ProgrammePage() {
  const params = useParams();

  const programme = decodeURIComponent(
    params.programme as string
  );

  const programmeName = programme
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <main className="min-h-full bg-gray-200 px-6 py-8 text-gray-900 md:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12">
          <p className="mb-3 text-sm font-medium text-blue-600">
            Programmes / {programmeName}
          </p>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {programmeName}
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
            Browse notes, past question papers, assignments and videos
            for your programme.
          </p>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px bg-gray-300" />

        {/* Section heading */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Resources
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Choose a category to continue.
          </p>
        </div>

        {/* Resource cards: 2 x 2 on wider screens, 1 column on phones */}
        <div className="grid gap-5 sm:grid-cols-2">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category.slug}
              href={`/programmes/${encodeURIComponent(programme)}/${
                category.slug
              }`}
              className="group"
            >
              <div
                className={`flex min-h-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${category.hoverBorder}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${category.iconBox}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.7}
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      {category.iconPaths.map((d) => (
                        <path
                          key={d}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={d}
                        />
                      ))}
                    </svg>
                  </div>

                  {/* 01, 02, ... from the card's position in the list */}
                  <span className="text-xs font-semibold text-gray-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-auto pt-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {category.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {category.description}
                  </p>

                  <div
                    className={`mt-6 flex items-center gap-2 text-sm font-medium ${category.linkColour}`}
                  >
                    {category.linkText}

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}