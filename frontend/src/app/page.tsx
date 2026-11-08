import Link from "next/link";
import Image from "next/image";
import ExploreButton from "@/components/ExploreButton";
import { NOVELLE_CONTACT_EMAIL } from "@/lib/cstEmail";

// Public landing page, shown at "/".
// No "use client" at the top: this page has no state, clicks handled in code,
// or browser-only features, so Next.js renders it on the server.
// (The Explore button is a small client component of its own.)
// Part 12: the "From the Novelle logo" design — big logo mark, NOVELLE
// wordmark, the tagline "Share · Learn · Grow", navy buttons, cream page.
// Part 21: the hero sits on a drone photo of the CST campus (navy fade over
// it so the text stays readable), the About cards became "How Novelle works",
// and the footer tells lecturers whom to contact for admin access.
// Photo: College of Science and Technology (public/images/campus/).

// Part 21: "How Novelle works" — the real path a resource takes, as three
// numbered steps (replaces the three About Us feature cards, a very common
// AI-template layout). Wording agreed 8 Nov: "someone", not "seniors", since
// students of any year and lecturers can upload.
const steps = [
  {
    title: "Someone shares it",
    text: "A student or lecturer uploads notes, past papers or assignments, placed by programme, year and module.",
  },
  {
    title: "An admin checks it",
    text: "The programme admin approves it, or sends it back with a reason. Admins can also add resources and videos directly.",
  },
  {
    title: "Everyone can find it",
    text: "Search or browse any programme by module. Star the ones worth keeping.",
  },
];

// Shared classes for the header links.
// (on the photo: always-light text, see --color-on-bar in globals.css)
const headerLink =
  "rounded-md px-4 py-2 text-[15px] font-semibold text-on-bar outline-none transition hover:bg-on-bar/10 focus-visible:ring-2 focus-visible:ring-gold";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      {/* Hero on the campus photo: header, logo mark, wordmark, Explore */}
      <section className="relative flex min-h-[86vh] flex-col overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/campus/aerial.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Navy fade: darker towards the bottom, where the text is */}
        <div className="absolute inset-0 bg-gradient-to-b from-bar/55 via-bar/80 to-bar/95" />

        <header className="relative flex items-center justify-between gap-4 px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <span className="flex rounded-lg bg-logo-tile p-1">
              <Image src="/novelle-mark.png" alt="" width={36} height={36} />
            </span>
            <span className="font-display text-base font-extrabold tracking-[0.14em] text-on-bar">NOVELLE</span>
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            {/* "#how" jumps to the element with id="how" further down this page */}
            <a href="#how" className={`hidden sm:block ${headerLink}`}>
              How it works
            </a>
            <Link href="/login" className={headerLink}>
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-gold px-4 py-2 text-[15px] font-bold text-bar outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-on-bar"
            >
              Sign Up
            </Link>
          </nav>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          {/* The navy "N" always sits on a cream tile here (dark photo) */}
          <span className="inline-flex rounded-3xl bg-logo-tile p-3">
            <Image src="/novelle-mark.png" alt="" width={104} height={104} priority />
          </span>

          <h1 className="mt-6 text-5xl font-extrabold tracking-[0.14em] text-on-bar md:text-7xl">
            NOVELLE
          </h1>

          <p className="mt-3 font-display text-sm font-semibold tracking-[0.2em] text-gold md:text-base">
            SHARE · LEARN · GROW
          </p>

          <p className="mt-6 max-w-xl text-lg text-on-bar/90">
            Notes and learning resources, shared by CST students.
          </p>

          {/* Goes to /home if logged in, otherwise /login (see components/ExploreButton.tsx) */}
          <ExploreButton />
        </div>

        <p className="relative px-6 pb-3 text-right text-xs text-on-bar/75 md:px-10">
          Photo: College of Science and Technology
        </p>
      </section>

      {/* How Novelle works */}
      <section id="how" className="border-b-[1.5px] border-sky-line bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-extrabold text-navy">How Novelle works</h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-ink-soft">
            Instead of hunting through group chats for last year&apos;s notes, CST
            students find study material for their modules in one place. Every
            resource goes through three hands before it reaches you.
          </p>

          {/* Numbered steps with arrows between them (arrows only on wide screens) */}
          <ol className="mt-10 grid gap-8 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className="contents">
                <div className="flex flex-col gap-2.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy font-display text-xl font-extrabold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-1 text-xl font-bold text-ink">{step.title}</h3>
                  <p className="text-base leading-relaxed text-ink-soft">{step.text}</p>
                </div>
                {index < steps.length - 1 && (
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-3 hidden h-8 w-8 text-gold md:block"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 12h15M14 6l6 6-6 6" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer (Part 21: lecturers learn whom to ask for admin access) */}
      <footer className="flex flex-col items-center justify-between gap-2 px-6 py-6 text-center text-sm text-ink-soft sm:flex-row md:px-10">
        <span>Novelle, College of Science and Technology, Royal University of Bhutan</span>
        <span>
          Lecturer and need admin access?{" "}
          <a href={`mailto:${NOVELLE_CONTACT_EMAIL}`} className="font-bold text-navy underline underline-offset-[3px]">
            {NOVELLE_CONTACT_EMAIL}
          </a>
        </span>
      </footer>
    </main>
  );
}
