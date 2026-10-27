
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { findProgrammeBySlug } from "@/lib/programmes";

const CATEGORIES = [
  {
    slug: "notes",
    title: "Notes",
    description:
      "Find study notes and learning materials organized by module.",
    linkText: "Browse notes",
    iconBox: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-800",
    linkColour: "text-indigo-600 dark:text-indigo-300",
    iconPaths: [
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    ],
  },
  {
    slug: "question-papers",
    title: "Question Papers",
    description:
      "Access previous examination papers organized by year and module.",
    linkText: "Browse papers",
    iconBox: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-800",
    linkColour: "text-cyan-600 dark:text-cyan-400",
    iconPaths: [
      "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    ],
  },
  {
    slug: "assignments",
    title: "Assignments",
    description:
      "Find assignments and coursework for your modules.",
    linkText: "Browse assignments",
    iconBox: "bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-800",
    linkColour: "text-fuchsia-600 dark:text-fuchsia-400",
    iconPaths: [
      "M9 5.25h6m-7.5 3h9m-10.5 3h12m-12 3h7.5M6 3.75h12A2.25 2.25 0 0120.25 6v14.25A2.25 2.25 0 0118 22.5H6a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 016 3.75z",
    ],
  },
  {
    slug: "videos",
    title: "Videos",
    description:
      "Watch video lessons chosen by your programme admins.",
    linkText: "Browse videos",
    iconBox: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-800",
    linkColour: "text-rose-600 dark:text-rose-400",
    iconPaths: [
      "M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      "M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z",
    ],
  },
];

function ArtisticBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Soft watercolor-style color fields */}
     <div className="absolute inset-0 bg-[#FCFBF8] dark:bg-[#0E141D]" />

      <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-blue-300/20 blur-[100px]" />

      <div className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-violet-300/20 blur-[110px]" />

      <div className="absolute right-[10%] top-[38%] h-72 w-72 rounded-full bg-amber-200/20 dark:bg-amber-500/10 blur-[90px]" />

      {/* Fine artistic lines and constellations */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="#8AA9E8"
          strokeWidth="1"
          strokeOpacity="0.23"
        >
          <path d="M970 0 L1200 230 L970 460 L740 230 Z" />
          <path d="M970 65 L1135 230 L970 395 L805 230 Z" />
          <path d="M970 130 L1070 230 L970 330 L870 230 Z" />

          <path d="M0 770 L180 950 L0 1130" />
          <path d="M0 830 L120 950 L0 1070" />

          <path d="M120 100 L250 230 L380 100" />
          <path d="M250 230 L250 360" />
          <path d="M820 640 L900 560 L980 640 L1060 560" />
        </g>

        <g
          stroke="#D6B66D"
          strokeWidth="1.2"
          strokeOpacity="0.35"
        >
          <path d="M890 490 L940 440 L990 490 L1040 440" />
          <path d="M170 600 L220 550 L270 600" />
          <path d="M1010 780 L1060 730 L1110 780" />
        </g>

        <g fill="#D6B66D" fillOpacity="0.6">
          <circle cx="940" cy="440" r="3" />
          <circle cx="990" cy="490" r="2.5" />
          <circle cx="220" cy="550" r="3" />
          <circle cx="270" cy="600" r="2.5" />
          <circle cx="1060" cy="730" r="3" />
        </g>

        <g fill="#8AA9E8" fillOpacity="0.45">
          <circle cx="250" cy="230" r="3" />
          <circle cx="380" cy="100" r="2.5" />
          <circle cx="900" cy="560" r="3" />
          <circle cx="1060" cy="560" r="2.5" />
          <circle cx="1135" cy="230" r="3" />
        </g>
      </svg>

      {/* Abstract Tree of Knowledge artwork */}
      <svg
        className="absolute -bottom-8 right-0 h-[430px] w-[390px] opacity-[0.24] sm:h-[520px] sm:w-[480px] lg:right-[2%] lg:h-[620px] lg:w-[570px]"
        viewBox="0 0 500 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="treeStroke"
            x1="250"
            y1="120"
            x2="250"
            y2="510"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#7D91D8" />
            <stop offset="0.55" stopColor="#8A83C9" />
            <stop offset="1" stopColor="#C9A45F" />
          </linearGradient>
        </defs>

        {/* Open book */}
        <g
          stroke="#8B8EC7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M250 485 C205 455 140 447 65 462 L65 520 C140 504 205 515 250 548" />
          <path d="M250 485 C295 455 360 447 435 462 L435 520 C360 504 295 515 250 548" />
          <path d="M250 485 L250 548" />

          <path d="M85 477 C145 465 193 478 225 495" strokeOpacity="0.6" />
          <path d="M85 496 C145 484 193 497 225 514" strokeOpacity="0.6" />
          <path d="M415 477 C355 465 307 478 275 495" strokeOpacity="0.6" />
          <path d="M415 496 C355 484 307 497 275 514" strokeOpacity="0.6" />
        </g>

        {/* Tree trunk */}
        <g
          stroke="url(#treeStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M250 485 C245 420 260 365 250 300 C245 260 252 225 250 190" />
          <path d="M250 380 C220 350 195 320 177 278" />
          <path d="M252 345 C285 316 311 280 325 242" />
          <path d="M250 300 C220 275 207 250 205 220" />
          <path d="M250 270 C275 245 282 220 281 195" />

          {/* Branches */}
          <path d="M177 278 L143 250 L130 216" />
          <path d="M195 320 L160 310 L130 280" />
          <path d="M325 242 L359 218 L370 182" />
          <path d="M311 280 L350 276 L380 250" />
          <path d="M205 220 L180 195 L178 168" />
          <path d="M281 195 L305 168 L306 140" />

          {/* Smaller branches */}
          <path d="M143 250 L110 244" />
          <path d="M160 310 L135 325" />
          <path d="M359 218 L390 210" />
          <path d="M350 276 L374 293" />
          <path d="M180 195 L151 187" />
          <path d="M305 168 L331 157" />
        </g>

        {/* Knowledge leaves / stars */}
        <g
          stroke="#C4A15D"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M130 216 C104 210 97 189 101 174 C119 178 133 194 130 216 Z" />
          <path d="M178 168 C159 151 166 132 178 120 C193 135 195 153 178 168 Z" />
          <path d="M306 140 C289 122 299 103 313 94 C326 110 323 128 306 140 Z" />
          <path d="M370 182 C370 160 389 146 407 150 C405 170 391 183 370 182 Z" />
          <path d="M380 250 C397 230 418 237 426 250 C412 266 394 266 380 250 Z" />
          <path d="M135 325 C117 339 98 330 93 314 C111 304 127 311 135 325 Z" />
          <path d="M110 244 C89 256 71 245 70 228 C88 221 103 230 110 244 Z" />
          <path d="M331 157 C348 143 367 152 370 168 C353 177 338 170 331 157 Z" />
          <path d="M374 293 C392 286 406 299 405 314 C388 318 377 308 374 293 Z" />
        </g>

        {/* Floating knowledge stars */}
        <g stroke="#C4A15D" strokeWidth="1.5" strokeLinecap="round">
          <path d="M91 125 V143 M82 134 H100" />
          <path d="M395 115 V133 M386 124 H404" />
          <path d="M145 385 V399 M138 392 H152" />
          <path d="M364 365 V379 M357 372 H371" />
          <path d="M250 105 V127 M239 116 H261" />
        </g>

        <g fill="#C4A15D">
          <circle cx="110" cy="150" r="3" />
          <circle cx="400" cy="340" r="3" />
          <circle cx="190" cy="100" r="2.5" />
          <circle cx="325" cy="405" r="2.5" />
          <circle cx="72" cy="370" r="2" />
          <circle cx="430" cy="190" r="2" />
        </g>
      </svg>
    </div>
  );
}

export default function ProgrammePage() {
  const params = useParams();

  const programme = decodeURIComponent(
    params.programme as string
  );

  const [programmeName, setProgrammeName] = useState<string | null>("");

  useEffect(() => {
    let active = true;

    findProgrammeBySlug(programme).then((found) => {
      if (active) {
        setProgrammeName(found ? found.name : null);
      }
    });

    return () => {
      active = false;
    };
  }, [programme]);

  if (programmeName === null) {
    return (
      <main className="relative isolate min-h-full overflow-hidden bg-[#FCFBF8] dark:bg-[#0E141D] px-6 py-8 text-gray-900 dark:text-[#E5EAF1] md:px-10 lg:px-16">
        <ArtisticBackground />

        <div className="relative z-10 mx-auto max-w-5xl">
          

          <div className="rounded-2xl border border-red-200/70 dark:border-red-900/60 bg-white/80 dark:bg-[#172130]/80 p-8 text-red-600 dark:text-red-400 shadow-sm backdrop-blur-md">
            <h1 className="text-xl font-semibold">
              Programme not found
            </h1>
            <p className="mt-2 text-sm">
              There is no programme at this address. Pick one from the
              sidebar.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-full overflow-hidden bg-[#FCFBF8] dark:bg-[#0E141D] px-6 py-8 text-gray-900 dark:text-[#E5EAF1] md:px-10 lg:px-16">
      {/* Artistic page background */}
      <ArtisticBackground />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Back button */}
        

        {/* Programme header */}
        
{/* Slim programme hero banner */}
<div className="relative mb-8 h-[180px] overflow-hidden rounded-2xl shadow-md sm:h-[200px] lg:h-[220px]">
  {/* Image fills the entire banner */}
  <Image
    src="/images/image.png"
    alt="Bhutan-inspired landscape"
    fill
    priority
    sizes="(max-width: 1024px) 100vw, 1024px"
    className="object-cover object-center"
  />

  {/* Overlay covers the entire image */}
  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/45 to-transparent" />

  {/* Heading on top of the image */}
  <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-9 lg:px-12">
    <p className="mb-2 text-xs font-medium text-white/80 sm:text-sm">
      Programmes / {programmeName || "…"}
    </p>

    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
      {programmeName || "Loading…"}
    </h1>

    <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
      Explore knowledge, share ideas, and discover learning resources.
    </p>
  </div>
</div>


        {/* Divider */}
        <div className="mb-8 h-px bg-gradient-to-r from-indigo-200 dark:from-indigo-800 via-violet-200 dark:via-violet-800 to-transparent" />

        {/* Section heading */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E5EAF1]">
            Explore resources
          </h2>

          <p className="mt-1 text-sm text-slate-600 dark:text-[#B4BFCD]">
            Choose a category to continue your learning journey.
          </p>
        </div>

        {/* Four resource cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category.slug}
              href={`/programmes/${encodeURIComponent(programme)}/${category.slug}`}
              className="group"
            >
              <div
                className={`group/card relative flex min-h-[225px] flex-col overflow-hidden rounded-2xl border border-white/90 dark:border-[#263345]/90 bg-white/85 dark:bg-[#172130]/85 p-7 shadow-[0_8px_30px_rgba(68,78,130,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white dark:hover:bg-[#1D2938] hover:shadow-[0_16px_40px_rgba(68,78,130,0.12)] ${category.hoverBorder}`}
              >
                {/* Card's own artistic geometric detail */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 opacity-60 transition-opacity duration-300 group-hover/card:opacity-100"
                >
                  <svg
                    width="155"
                    height="130"
                    viewBox="0 0 155 130"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g
                      stroke="#9CAFE6"
                      strokeWidth="1"
                      strokeOpacity="0.7"
                    >
                      <path d="M90 -25 L165 40 L90 105 L15 40 Z" />
                      <path d="M90 -5 L145 40 L90 85 L35 40 Z" />
                      <path d="M90 15 L125 40 L90 65 L55 40 Z" />
                      <path d="M118 5 L155 35 M133 5 L155 23" />
                    </g>

                    <g fill="#D6B66D" fillOpacity="0.65">
                      <circle cx="119" cy="75" r="2" />
                      <circle cx="133" cy="63" r="2" />
                      <circle cx="105" cy="88" r="2" />
                    </g>
                  </svg>
                </div>

                {/* Card content */}
                <div className="relative z-10 flex flex-1 flex-col">
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

                    <span className="text-xs font-semibold tracking-widest text-slate-400 dark:text-[#6B788A]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-auto pt-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-[#E5EAF1]">
                      {category.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[#B4BFCD]">
                      {category.description}
                    </p>

                    <div
                      className={`mt-6 flex items-center gap-2 text-sm font-semibold ${category.linkColour}`}
                    >
                      {category.linkText}

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
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
              </div>
            </Link>
          ))}
        </div>

        {/* Small footer detail */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-[#8B98AA]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4 text-amber-600 dark:text-amber-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-1.159 6.364l-1.591-1.591M12 18.75V21m-6.364-2.636l1.591-1.591M3 12h2.25m1.159-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
          Every resource is an opportunity to learn something new.
        </div>
      </div>
    </main>
  );
}
