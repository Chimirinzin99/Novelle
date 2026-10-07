"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// The programme links, written once as data instead of 10 copies of <a>.
// slug = the part of the URL after /programmes/
const PROGRAMMES = [
  { slug: "civil-engineering", name: "Civil Engineering" },
  { slug: "electrical-engineering", name: "Electrical Engineering" },
  { slug: "ece", name: "Electronics and Communication Engineering (ECE)" },
  { slug: "information-technology", name: "Information Technology (IT)" },
  { slug: "architecture", name: "Architecture" },
  { slug: "engineering-geology", name: "Engineering Geology" },
  {
    slug: "instrumentation-and-control-engineering",
    name: "Instrumentation and Control Engineering (ICE)",
  },
  {
    slug: "water-resources-engineering",
    name: "Water Resources Engineering (WRE)",
  },
  { slug: "mechanical-engineering", name: "Mechanical Engineering" },
  { slug: "software-engineering", name: "Software Engineering" },
];

// Two looks for a link: the current page (blue) and every other page (grey).
// Returning a class string from a function keeps the JSX below short.
function linkClass(active: boolean) {
  return active
    ? "block w-full rounded-lg bg-blue-100 px-3 py-2.5 text-sm font-medium text-blue-700"
    : "block w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50";
}

export default function Sidebar() {
  const router = useRouter();
  // usePathname() gives the current URL path, e.g. "/programmes/ece/notes".
  // It updates automatically every time the student navigates.
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLoggedIn(!!session);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-white px-4 py-6 shadow-sm">
      <div className="mb-8 shrink-0 px-3">
        <h1 className="text-2xl font-bold text-blue-600">Novelle</h1>
        <p className="mt-1 text-xs text-gray-500">CST Student Platform</p>
      </div>

      <nav className="shrink-0 space-y-1">
        <Link href="/home" className={linkClass(pathname === "/home")}>
          Home
        </Link>

        {/* Upload: an action, so it gets blue text and a "+" even when not
            selected. On the upload page itself it uses the normal active style. */}
        <Link
          href="/submit-note"
          className={
            pathname === "/submit-note"
              ? linkClass(true)
              : "block w-full rounded-lg px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
          }
        >
          <span className="mr-2">+</span>
          Upload
        </Link>
      </nav>

      {/* My Library: the student's own things */}
      <div className="mt-8 shrink-0">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          My Library
        </p>

        <nav className="space-y-1">
          <Link
            href="/my-submissions"
            className={linkClass(pathname === "/my-submissions")}
          >
            My Submissions
          </Link>

          <Link href="/liked" className={linkClass(pathname === "/liked")}>
            Liked
          </Link>
        </nav>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <p className="mb-2 shrink-0 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Programmes
        </p>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
          {PROGRAMMES.map((programme) => {
            const href = `/programmes/${programme.slug}`;
            // startsWith: the programme stays highlighted on its
            // notes / question-papers / assignments pages too.
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link key={programme.slug} href={href} className={linkClass(active)}>
                {programme.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 shrink-0 border-t pt-4">
        <a href="#" className={linkClass(false)}>
          Settings
        </a>

        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        ) : (
          <Link href="/login" className={`mt-1 ${linkClass(false)}`}>
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}