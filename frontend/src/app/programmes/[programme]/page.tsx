"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProgrammePage() {
  const params = useParams();

  const programme = decodeURIComponent(
    params.programme as string
  );

  const programmeName = programme
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>

            Back to programmes
          </Link>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-500">
              Programmes / {programmeName}
            </p>

            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {programmeName}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
              Browse notes, past question papers, and assignments
              for your programme.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px bg-white/10" />

        {/* Section heading */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            Resources
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose a category to continue.
          </p>
        </div>

        {/* Resource Cards */}
        <div className="grid gap-5 md:grid-cols-3">

          {/* Notes */}
          <Link
            href={`/programmes/${encodeURIComponent(
              programme
            )}/notes`}
            className="group"
          >
            <div className="flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06]">

              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </div>

                <span className="text-xs font-semibold text-slate-600">
                  01
                </span>
              </div>

              <div className="mt-auto">
                <h3 className="text-xl font-semibold text-white">
                  Notes
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Find study notes and learning materials
                  organized by module.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-indigo-400">
                  Browse notes

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

          {/* Question Papers */}
          <Link
            href={`/programmes/${encodeURIComponent(
              programme
            )}/question-papers`}
            className="group"
          >
            <div className="flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.06]">

              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>

                <span className="text-xs font-semibold text-slate-600">
                  02
                </span>
              </div>

              <div className="mt-auto">
                <h3 className="text-xl font-semibold text-white">
                  Question Papers
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Access previous examination papers
                  organized by year and module.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-cyan-400">
                  Browse papers

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

          {/* Assignments */}
          <Link
            href={`/programmes/${encodeURIComponent(
              programme
            )}/assignments`}
            className="group"
          >
            <div className="flex min-h-[250px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-400/40 hover:bg-white/[0.06]">

              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5.25h6m-7.5 3h9m-10.5 3h12m-12 3h7.5M6 3.75h12A2.25 2.25 0 0120.25 6v14.25A2.25 2.25 0 0118 22.5H6a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 016 3.75z"
                    />
                  </svg>
                </div>

                <span className="text-xs font-semibold text-slate-600">
                  03
                </span>
              </div>

              <div className="mt-auto">
                <h3 className="text-xl font-semibold text-white">
                  Assignments
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Find assignments and coursework for
                  your modules.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-fuchsia-400">
                  Browse assignments

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

        </div>
      </div>
    </main>
  );
}