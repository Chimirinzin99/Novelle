"use client";

// Part 12: navy admin sidebar from the chosen design — the shared <Logo />
// (dark version, role as its tagline), cream "current page" pill, light
// text on navy. Links, profile cache and logout work exactly as before.
// Responsive part: below 1024 px (lg) the sidebar becomes a slide-in menu,
// like the student one. A navy top bar with ☰ and the logo replaces the old
// row of links across the top; ☰ opens the menu, and the backdrop, X, Escape
// or choosing a link closes it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { isAdminRole, isSuperAdminRole, roleLabel } from "@/lib/roles";

type SidebarProfile = {
  full_name: string | null;
  email: string | null;
  role: string;
};

// Order (4 Nov): browse before add. "All Resources" is the library page
// (/admin/all-resources); "Add Resource" is the upload page.
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Pending Submissions", icon: ClipboardCheck },
  { href: "/admin/all-resources", label: "All Resources", icon: Library },
  { href: "/admin/resources", label: "Add Resource", icon: FileText },
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
  // Phones/tablets: is the slide-in menu open?
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the slide-in menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

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
    // Current page = cream pill with navy text; others = light text on the bar.
    // Dark mode part: the bar uses its own colours (bg-bar, text-on-bar in
    // globals.css) so it stays dark when "navy" turns light blue.
    // focus-visible: a ring only for keyboard (Tab) users.
    return `mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] outline-none transition focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-cream font-bold text-navy" : "font-medium text-[#E3ECF8] hover:bg-on-bar/10 hover:text-on-bar"}`;
  };

  return (
    <>
      {/* Phones/tablets (below lg): navy top bar with ☰ and the logo */}
      <header className="z-30 flex h-16 shrink-0 items-center gap-2 bg-bar px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          className="rounded-lg p-2 text-on-bar outline-none transition hover:bg-on-bar/10 focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Logo tone="dark" href="/admin" tagline={profile ? roleLabel(profile.role) : "\u00a0"} />
      </header>

      {/* Dark backdrop behind the open menu; a click on it closes the menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden dark:bg-black/60"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Laptops: always shown on the left (fixed; the layout leaves lg:ml-72).
          Phones/tablets: slides in when ☰ is pressed; while closed it is off
          screen and invisible, so Tab can't reach it. Clicking a link closes it. */}
      <aside
        id="admin-sidebar"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
        }}
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col bg-bar text-on-bar",
          "transition-transform duration-200 lg:z-40 lg:translate-x-0",
          menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full max-lg:invisible",
        ].join(" ")}
      >
        {/* Phones/tablets: close button */}
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-4 rounded-lg p-2 text-on-bar outline-none transition hover:bg-on-bar/10 focus-visible:ring-2 focus-visible:ring-gold lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo; the tagline shows the role ("Programme admin" / "Super admin") */}
        <div className="px-5 pb-4 pt-6">
          <Logo tone="dark" href="/admin" tagline={profile ? roleLabel(profile.role) : "\u00a0"} />
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9D8EE]">Workspace</p>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={linkClass(href)}><Icon className="h-5 w-5" /><span>{label}</span></Link>
          ))}
        </nav>

        <div className="border-t border-on-bar/15 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-bar-soft px-3 py-3">
            {profile ? (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-sky text-sm font-bold text-white">
                  {(profile.full_name?.trim().charAt(0) || "A").toUpperCase()}
                </span>
                <div className="min-w-0"><p className="truncate text-sm font-bold text-on-bar">{profile.full_name || "Admin"}</p><p className="truncate text-xs text-[#C9D8EE]">{profile.email || ""}</p></div>
              </>
            ) : (
              // Grey placeholder while the profile loads (first visit or a browser refresh only).
              <>
                <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-on-bar/20" />
                <div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-on-bar/20" /><div className="h-3 w-32 animate-pulse rounded bg-on-bar/20" /></div>
              </>
            )}
          </div>
          {/* Dark mode part: one-click light/dark */}
          <ThemeToggle className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#E3ECF8] outline-none transition hover:bg-on-bar/10 hover:text-on-bar focus-visible:ring-2 focus-visible:ring-gold" />
          <Link href="/admin/profile" aria-current={pathname === "/admin/profile" ? "page" : undefined} className={linkClass("/admin/profile")}><UserRound className="h-5 w-5" /><span>Profile</span></Link>
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#E3ECF8] outline-none transition hover:bg-on-bar/10 hover:text-on-bar focus-visible:ring-2 focus-visible:ring-gold"><LogOut className="h-5 w-5" /><span>Logout</span></button>
        </div>
      </aside>
    </>
  );
}
