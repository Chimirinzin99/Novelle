
import Link from "next/link";
import ExploreButton from "@/components/ExploreButton";

// Public landing page, shown at "/".
// No "use client" at the top: this page has no state, clicks handled in code,
// or browser-only features, so Next.js renders it on the server.
// (Step 4 will add a small client part for the Explore button.)

// Feature cards for the About Us section.
// Keeping them in an array means the cards are written once and repeated with .map().
const features = [
  {
    title: "Browse every programme",
    text: "Notes, past papers and assignments from all ten CST programmes, sorted by year, semester and module.",
  },
  {
    title: "Share your notes",
    text: "Upload your own study material. A programme admin checks each submission before it goes live.",
  },
  {
    title: "Keep what helps",
    text: "View or download any resource, and like the ones you want to find again.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-200">
      {/* Header: small text logo on the left, links on the right */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Novelle
        </Link>

        <nav className="flex items-center gap-2">
          {/* "#about" jumps to the element with id="about" further down this page */}
          <a
            href="#about"
            className="hidden rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white sm:block"
          >
            About Us
          </a>

          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero: big centred wordmark and the Explore button */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-blue-600 md:text-8xl">
          Novelle
        </h1>

        <p className="mt-4 max-w-xl text-lg text-gray-500">
          Notes and learning resources, shared by CST students.
        </p>

        {/* Goes to /home if logged in, otherwise /login (see components/ExploreButton.tsx) */}
        <ExploreButton />
        
      </section>

      {/* About Us */}
      <section id="about" className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-gray-900">About Us</h2>

          <p className="mt-4 max-w-3xl leading-7 text-gray-600">
            Novelle is a resource-sharing platform for students of the College
            of Science and Technology. Instead of hunting through group chats
            for last year&apos;s notes, students can find study material for
            their modules in one place, and share their own.
          </p>

          {/* One card per item in the features array */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 bg-gray-50 p-6"
              >
                <h3 className="font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-gray-500">
        Novelle · College of Science and Technology, Royal University of Bhutan
      </footer>
    </main>
  );
}
