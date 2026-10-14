
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { programmeHref } from "@/lib/programmes";

const PROGRAMMES = [
  { name: "Civil Engineering", label: "Civil Engineering" },
  { name: "Electrical Engineering", label: "Electrical Engineering" },
  {
    name: "Electronics and Communication Engineering",
    label: "Electronics & Communication (ECE)",
  },
  { name: "Information Technology", label: "Information Technology (IT)" },
  { name: "Architecture", label: "Architecture" },
  { name: "Engineering Geology", label: "Engineering Geology" },
  {
    name: "Instrumentation and Control Engineering",
    label: "Instrumentation & Control (ICE)",
  },
  {
    name: "Water Resources Engineering",
    label: "Water Resources Engineering (WRE)",
  },
  { name: "Mechanical Engineering", label: "Mechanical Engineering" },
  { name: "Software Engineering", label: "Software Engineering" },
];

type IconName =
  | "book"
  | "home"
  | "library"
  | "heart"
  | "graduation"
  | "settings"
  | "logout"
  | "login"
  | "chevron";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...common}
    >
      {name === "book" && (
        <>
          <path d="M12 7v14" />
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23z" />
          <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 1 2.5 2z" />
        </>
      )}

      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9" />
          <path d="M9 21v-7h6v7" />
        </>
      )}

      {name === "library" && (
        <>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5z" />
          <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
          <path d="M8 6h8M8 10h6" />
        </>
      )}

      {name === "heart" && (
        <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      )}

      {name === "graduation" && (
        <>
          <path d="m2 9 10-5 10 5-10 5z" />
          <path d="M6 11v5c3.5 3 8.5 3 12 0v-5" />
          <path d="M22 9v7" />
        </>
      )}

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.5-2.6 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.5 2.6-1.4 1.1a7 7 0 0 1 0 2Z" />
        </>
      )}

      {name === "logout" && (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
        </>
      )}

      {name === "login" && (
        <>
          <path d="M14 17l5-5-5-5" />
          <path d="M19 12H7" />
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
        </>
      )}

      {name === "chevron" && <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function navClass(active: boolean) {
  return [
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
    "text-sm transition-colors duration-150",
    active
      ? "bg-[#E7EEF8] font-semibold text-[#294C78]"
      : "text-slate-600 hover:bg-[#F0F2F5] hover:text-slate-900",
  ].join(" ");
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setLoggedIn(!!session);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setLoggedIn(!!session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[#E7E5DF] bg-[#FCFBF8] px-4 py-5">
      {/* Brand */}
      <Link
        href="/home"
        className="mb-8 flex shrink-0 items-center gap-3 rounded-xl px-2 py-1"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#294C78] text-[#F4E6C5] shadow-sm">
          <Icon name="book" className="h-6 w-6" />
        </span>

        <span>
          <span className="block text-xl font-bold tracking-tight text-[#24344D]">
            Novelle
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-500">
            CST Learning Hub
          </span>
        </span>
      </Link>

      {/* Main navigation */}
      <nav className="shrink-0 space-y-1">
        <Link href="/home" className={navClass(pathname === "/home")}>
          <Icon name="home" />
          <span>Home</span>
        </Link>

        {/* Original blue plus sign */}
        <Link
          href="/submit-note"
          className={
            pathname === "/submit-note"
              ? navClass(true)
              : "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          }
        >
          <span className="text-xl font-semibold leading-none">+</span>
          <span>Upload</span>
        </Link>
      </nav>

      {/* My Library */}
      <section className="mt-8 shrink-0">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          My Library
        </p>

        <nav className="space-y-1">
          <Link
            href="/my-submissions"
            className={navClass(pathname === "/my-submissions")}
          >
            <Icon name="library" />
            <span>My Submissions</span>
          </Link>

          <Link
            href="/liked"
            className={navClass(pathname === "/liked")}
          >
            <Icon name="heart" />
            <span>Liked Resources</span>
          </Link>
        </nav>
      </section>

      {/* Scrollable programme list */}
      <section className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Programmes
          </p>
          <Icon
            name="graduation"
            className="h-4 w-4 text-slate-400"
          />
        </div>

        <nav className="min-h-0 flex-1 space-y-0 overflow-y-auto pr-1 [scrollbar-color:#D5D9E0_transparent] [scrollbar-width:thin]">
          {PROGRAMMES.map((programme) => {
            const href = programmeHref(programme.name);
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={programme.name}
                href={href}
                title={programme.name}
                className={[
                  "group relative flex w-full items-center gap-3",
                  "rounded-lg px-3 py-3 text-sm transition-colors",
                  active
                    ? "bg-[#E7EEF8] font-semibold text-[#294C78]"
                    : "text-slate-600 hover:bg-[#F0F2F5] hover:text-slate-900",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    active
                      ? "bg-[#456FAD]"
                      : "bg-slate-300 group-hover:bg-slate-500",
                  ].join(" ")}
                />

                <span className="min-w-0 flex-1 leading-5">
                  {programme.label}
                </span>

                {active && (
                  <Icon
                    name="chevron"
                    className="h-4 w-4 shrink-0 text-[#456FAD]"
                  />
                )}

                {/* Underline for every programme */}
                <span className="pointer-events-none absolute bottom-0 left-3 right-3 border-b border-[#E7E5DF]" />
              </Link>
            );
          })}
        </nav>
      </section>

      {/* Bottom actions */}
      <div className="mt-4 shrink-0 border-t border-[#E7E5DF] pt-4">
        <Link
          href="/settings"
          className={navClass(pathname === "/settings")}
        >
          <Icon name="settings" />
          <span>Settings</span>
        </Link>

        {loggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        ) : (
          <Link
            href="/login"
            className={`mt-1 ${navClass(pathname === "/login")}`}
          >
            <Icon name="login" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
