"use client";

// Programme overview page (/programmes/<slug>): banner + 4 category cards
// (2 × 2 grid, as the user asked in Part 6).
// Part 12: theme colours. Each card's icon uses its type's badge colour from
// lib/resourceTypes.ts, so "Question Papers" is navy here AND on every
// question-paper badge. The old decorative background (purple/violet
// blobs, lines and tree drawing) was removed: it used colours outside the
// logo palette and sat behind every card. The banner picture is unchanged.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { findProgrammeBySlug } from "@/lib/programmes";
import { resourceTypeBadge, type ResourceTypeCode } from "@/lib/resourceTypes";

// slug = the URL part; type = the resource type code (for the colour).
const CATEGORIES: {
  slug: string;
  title: string;
  description: string;
  type: ResourceTypeCode;
  linkText: string;
  iconPaths: string[];
}[] = [
  {
    slug: "notes",
    title: "Notes",
    description:
      "Find study notes and learning materials organized by module.",
    type: "note",
    linkText: "Browse notes",
    iconPaths: [
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    ],
  },
  {
    slug: "question-papers",
    title: "Question Papers",
    description:
      "Access previous examination papers organized by year and module.",
    type: "question_paper",
    linkText: "Browse papers",
    iconPaths: [
      "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    ],
  },
  {
    slug: "assignments",
    title: "Assignments",
    description:
      "Find assignments and coursework for your modules.",
    type: "assignment",
    linkText: "Browse assignments",
    iconPaths: [
      "M9 5.25h6m-7.5 3h9m-10.5 3h12m-12 3h7.5M6 3.75h12A2.25 2.25 0 0120.25 6v14.25A2.25 2.25 0 0118 22.5H6a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 016 3.75z",
    ],
  },
  {
    slug: "videos",
    title: "Videos",
    description:
      "Watch video lessons chosen by your programme admins.",
    type: "video",
    linkText: "Browse videos",
    iconPaths: [
      "M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      "M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z",
    ],
  },
];

export default function ProgrammePage() {
  const params = useParams();
  const programme = decodeURIComponent(params.programme as string);

  // "" = still loading; null = no programme with this slug.
  const [programmeName, setProgrammeName] = useState<string | null>("");

  useEffect(() => {
    let active = true;

    findProgrammeBySlug(programme).then((found) => {
      if (active) setProgrammeName(found ? found.name : null);
    });

    // If the student clicks another programme before this one loads,
    // ignore the late answer.
    return () => {
      active = false;
    };
  }, [programme]);

  if (programmeName === null) {
    return (
      <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-white p-8" role="alert">
          <h1 className="text-xl font-bold text-red-700">Programme not found</h1>
          <p className="mt-2 text-sm text-ink-soft">
            There is no programme at this address. Pick one from the sidebar.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-cream px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Banner: the dzong picture with a navy fade so the white text is
            readable on any part of the image. */}
        <div className="relative mb-8 h-[180px] overflow-hidden rounded-2xl sm:h-[200px] lg:h-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/image.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/55 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-9 lg:px-12">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.12em] text-white/85">
              Programme
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {programmeName || "Loading…"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
              Explore knowledge, share ideas, and discover learning resources.
            </p>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-[19px] font-bold text-navy">Explore resources</h2>
          <p className="mt-1 text-sm text-ink-soft">Choose a category to continue your learning journey.</p>
        </div>

        {/* Four category cards, 2 × 2 */}
        <div className="grid gap-5 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/programmes/${encodeURIComponent(programme)}/${category.slug}`}
              className="group flex min-h-[200px] flex-col rounded-2xl border border-line bg-white p-6 outline-none transition duration-200 hover:-translate-y-0.5 hover:border-sky-line hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy/40"
            >
              {/* Icon in this type's badge colour */}
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${resourceTypeBadge(category.type)}`}
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.7}
                  stroke="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  {category.iconPaths.map((d) => (
                    <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
                  ))}
                </svg>
              </span>

              <div className="mt-auto pt-6">
                <h3 className="text-xl font-bold text-ink">{category.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{category.description}</p>

                <span className="mt-5 flex items-center gap-2 text-[15px] font-bold text-navy-soft group-hover:text-navy">
                  {category.linkText}
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}