"use client";

// Part 12: hard-coded colours (e.g. bg-[#294C78], text-slate-500) switched to
// the theme colours from app/globals.css (bg-navy, text-ink-soft …).
// Nothing else on this page changed.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StudentProfile = {
  full_name: string | null;
  programme_id: number | null;
  programmes: { name: string } | null;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "S";
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email ?? "");

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, programme_id, programmes(name)")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Load profile error:", profileError);
      setError("Could not load your profile details.");
    } else {
      const programme = data.programmes as unknown as {
        name: string;
      } | null;

      setProfile({
        full_name: data.full_name,
        programme_id: data.programme_id,
        programmes: programme,
      });
    }

    setLoading(false);
  }

  const fullName = profile?.full_name?.trim() || "Student";

  return (
    <main className="min-h-full bg-cream px-5 py-7 text-ink md:px-10 md:py-9 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold text-navy-soft">My Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Profile
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            View your account details and find your personal learning library.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-ink-soft">Loading your profile...</p>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy text-xl font-semibold text-white">
                {initials(fullName)}
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-navy">
                  {fullName}
                </h2>
                <p className="mt-1 break-all text-sm text-ink-soft">
                  {email || "No email available"}
                </p>
                <p className="mt-2 inline-flex rounded-full bg-sky-tint px-3 py-1 text-xs font-medium text-navy">
                  {profile?.programmes?.name || "Programme not assigned"}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-navy">
              Your library
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Review uploads and return to resources you have liked.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/my-submissions"
              className="group flex min-h-44 items-start gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-line hover:shadow-md focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-tint text-navy">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 3.75v5h5M9 13h6M9 16.5h6"
                  />
                </svg>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">
                    My Submissions
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-lg text-navy-soft transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-ink-soft">
                  Check the review status of notes and other resources you have
                  uploaded.
                </span>
              </span>
            </Link>

            <Link
              href="/liked"
              className="group flex min-h-44 items-start gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-line hover:shadow-md focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-tint text-navy">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
                  />
                </svg>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">
                    Liked Resources
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-lg text-navy-soft transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-ink-soft">
                  Find your saved notes, question papers, assignments, and
                  videos.
                </span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}