import Link from "next/link";
import Image from "next/image";
import ExploreButton from "@/components/ExploreButton";
import Logo from "@/components/Logo";

// Public landing page, shown at "/".
// No "use client" at the top: this page has no state, clicks handled in code,
// or browser-only features, so Next.js renders it on the server.
// (The Explore button is a small client component of its own.)
// Part 12: the "From the Novelle logo" design — big logo mark, NOVELLE
// wordmark, the tagline "Share · Learn · Grow", navy buttons, cream page.

// Feature cards for the About Us section.
// Keeping them in an array means the cards are written once and repeated with .map().
// word = the tagline word each card stands for.
const features = [
  {
    word: "Learn",
    title: "Browse every programme",
    text: "Notes, past papers and assignments from all ten CST programmes, sorted by year, semester and module.",
  },
  {
    word: "Share",
    title: "Share your notes",
    text: "Upload your own study material. A programme admin checks each submission before it goes live.",
  },
  {
    word: "Grow",
    title: "Keep what helps",
    text: "View or download any resource, and like the ones you want to find again.",
  },
];

// Shared classes for the header links.
const headerLink =
  "rounded-lg px-4 py-2 text-[15px] font-semibold text-ink-nav outline-none transition hover:bg-white hover:text-navy focus-visible:ring-2 focus-visible:ring-navy/40";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      {/* Header: logo on the left, links on the right */}
      <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-10">
        <Logo href="/" />

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {/* "#about" jumps to the element with id="about" further down this page */}
          <a href="#about" className={`hidden sm:block ${headerLink}`}>
            About Us
          </a>
          <Link href="/login" className={headerLink}>
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-navy px-4 py-2 text-[15px] font-bold text-white outline-none transition hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero: the big logo mark, the wordmark and the Explore button */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <Image src="/novelle-mark.png" alt="" width={120} height={120} priority />

        <h1 className="mt-6 text-5xl font-extrabold tracking-[0.14em] text-navy md:text-7xl">
          NOVELLE
        </h1>

        <p className="mt-3 font-display text-sm font-semibold tracking-[0.2em] text-muted-blue md:text-base">
          SHARE · LEARN · GROW
        </p>

        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          Notes and learning resources, shared by CST students.
        </p>

        {/* Goes to /home if logged in, otherwise /login (see components/ExploreButton.tsx) */}
        <ExploreButton />
      </section>

      {/* About Us */}
      <section id="about" className="border-t border-line bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-extrabold text-navy">About Us</h2>

          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">
            Novelle is a resource-sharing platform for students of the College
            of Science and Technology. Instead of hunting through group chats
            for last year&apos;s notes, students can find study material for
            their modules in one place, and share their own.
          </p>

          {/* One card per item in the features array */}
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-line bg-cream p-6">
                <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">
                  {/* The logo's star, small (decoration) */}
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M12 1.5c.6 5.2 3.3 9.3 10.5 10.5C15.3 13.2 12.6 17.3 12 22.5 11.4 17.3 8.7 13.2 1.5 12 8.7 10.8 11.4 6.7 12 1.5z"
                      className="fill-gold"
                    />
                  </svg>
                  {feature.word}
                </p>
                <h3 className="mt-3 text-lg font-bold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-sm text-ink-soft">
        Novelle · College of Science and Technology, Royal University of Bhutan
      </footer>
    </main>
  );
}