"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { isAdminRole, isSuperAdminRole, roleLabel } from "@/lib/roles";

type SidebarProfile = {
  full_name: string | null;
  email: string | null;
  role: string;
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Pending Submissions", icon: ClipboardCheck },
  { href: "/admin/resources", label: "Add Resources", icon: FileText },
  { href: "/admin/modules", label: "Manage Modules", icon: GraduationCap },
];

// ---- Small profile cache -------------------------------------------------
// Kept in sessionStorage (this browser tab only, gone when the tab closes).
// Stored with the user's id so a different account never sees someone else's.
const PROFILE_CACHE_KEY = "novelle:admin-sidebar-profile";

function readCachedProfile(userId: string): SidebarProfile | null {
  try {
    const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved?.userId === userId ? (saved.profile as SidebarProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(userId: string, profile: SidebarProfile) {
  try {
    window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }));
  } catch {
    // Storage can be blocked (private mode); the sidebar still works without it.
  }
}

function clearCachedProfile() {
  try {
    window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

// Sidebar shared by every /admin page (rendered once in app/admin/layout.tsx).
// Links use <Link>, not <a>: <Link> changes page without reloading the browser,
// so this sidebar stays mounted and keeps the profile it already loaded.
// With <a>, every click reloaded the app and the profile + "Manage Users" flickered.
export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<SidebarProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      // getSession() reads the login saved in this browser (no network call),
      // unlike getUser() which asks Supabase's server. The sidebar only DISPLAYS
      // things; real permission checks happen on each page and in the backend.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      // 1) Show the remembered profile straight away (no flicker after the first load).
      const cached = readCachedProfile(user.id);
      if (cached && active) setProfile(cached);

      // 2) Then load the fresh profile, in case the role or name changed.
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!data || !isAdminRole(data.role)) {
        clearCachedProfile();
        router.replace("/home");
        return;
      }
      const fresh = { ...data, email: data.email || user.email || null };
      setProfile(fresh);
      writeCachedProfile(user.id, fresh);
    }

    void loadProfile();
    return () => { active = false; };
  }, [router]);

  async function logout() {
    clearCachedProfile();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const links = [
    ...navItems,
    ...(isSuperAdminRole(profile?.role)
      ? [{ href: "/admin/users", label: "Manage Users", icon: Users }]
      : []),
  ];

  const linkClass = (href: string) => {
    const active = href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
    return `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition md:mb-1 md:w-full md:gap-3 md:px-3 md:py-3 ${active ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-[#B4BFCD] hover:bg-gray-100 dark:hover:bg-[#263446] hover:text-gray-900 dark:hover:text-[#E5EAF1]"}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 font-bold text-gray-900 dark:text-[#E5EAF1]">
            <BookOpen className="h-5 w-5 text-blue-800 dark:text-blue-300" /> Novelle
          </button>
          <div className="flex items-center gap-3">
            <span className="max-w-36 truncate text-right text-xs text-gray-500 dark:text-[#8B98AA]">{profile ? profile.full_name || roleLabel(profile.role) : ""}</span>
            <ThemeToggle variant="icon" />
            <button onClick={logout} aria-label="Log out" className="rounded-lg border border-gray-200 dark:border-[#263345] p-2 text-gray-600 dark:text-[#B4BFCD] hover:bg-gray-50 dark:hover:bg-[#1D2938]"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}><Icon className="h-4 w-4" /><span>{label}</span></Link>
          ))}
          <Link href="/admin/profile" className={linkClass("/admin/profile")}><UserRound className="h-4 w-4" /><span>Profile</span></Link>
        </nav>
      </header>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] md:flex">
        <div className="border-b border-gray-200 dark:border-[#263345] px-6 py-5">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-[#E5EAF1]">
            <BookOpen className="h-6 w-6 text-blue-800 dark:text-blue-300" /> Novelle
          </button>
          <p className="mt-1 pl-8 text-xs text-gray-500 dark:text-[#8B98AA]">{profile ? roleLabel(profile.role) : "\u00a0"}</p>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6B788A]">Workspace</p>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={linkClass(href)}><Icon className="h-5 w-5" /><span>{label}</span></Link>
          ))}
        </nav>

        <div className="border-t border-gray-200 dark:border-[#263345] p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            {profile ? (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-sm font-semibold text-blue-800 dark:text-blue-300">
                  {(profile.full_name?.trim().charAt(0) || "A").toUpperCase()}
                </span>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900 dark:text-[#E5EAF1]">{profile.full_name || "Admin"}</p><p className="truncate text-xs text-gray-500 dark:text-[#8B98AA]">{profile.email || ""}</p></div>
              </>
            ) : (
              // Grey placeholder while the profile loads (first visit or a browser refresh only).
              <>
                <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-[#1D2938]" />
                <div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-[#1D2938]" /><div className="h-3 w-36 animate-pulse rounded bg-gray-100 dark:bg-[#1D2938]" /></div>
              </>
            )}
          </div>
          <Link href="/admin/profile" aria-current={pathname === "/admin/profile" ? "page" : undefined} className={linkClass("/admin/profile")}><UserRound className="h-5 w-5" /><span>Profile</span></Link>
          <ThemeToggle className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-600 dark:text-[#B4BFCD] transition hover:bg-gray-100 dark:hover:bg-[#263446] hover:text-gray-900 dark:hover:text-[#E5EAF1]" />
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-600 dark:text-[#B4BFCD] transition hover:bg-gray-100 dark:hover:bg-[#263446] hover:text-gray-900 dark:hover:text-[#E5EAF1]"><LogOut className="h-5 w-5" /><span>Logout</span></button>
        </div>
      </aside>
    </>
  );
}