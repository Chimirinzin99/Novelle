"use client";

import { useEffect, useState } from "react";
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

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<SidebarProfile | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!data || !isAdminRole(data.role)) {
        router.replace("/home");
        return;
      }
      setProfile({ ...data, email: data.email || user.email || null });
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);

  async function logout() {
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
    return `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition md:mb-1 md:w-full md:gap-3 md:px-3 md:py-3 ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 font-bold text-gray-900">
            <BookOpen className="h-5 w-5 text-blue-800" /> Novelle
          </button>
          <div className="flex items-center gap-3">
            <span className="max-w-36 truncate text-right text-xs text-gray-500">{profile?.full_name || roleLabel(profile?.role)}</span>
            <button onClick={logout} aria-label="Log out" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {links.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className={linkClass(href)}><Icon className="h-4 w-4" /><span>{label}</span></a>
          ))}
          <a href="/admin/profile" className={linkClass("/admin/profile")}><UserRound className="h-4 w-4" /><span>Profile</span></a>
        </nav>
      </header>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-200 px-6 py-5">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <BookOpen className="h-6 w-6 text-blue-800" /> Novelle
          </button>
          <p className="mt-1 pl-8 text-xs text-gray-500">{profile ? roleLabel(profile.role) : "Admin workspace"}</p>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Workspace</p>
          {links.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={linkClass(href)}><Icon className="h-5 w-5" /><span>{label}</span></a>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-800">
              {(profile?.full_name?.trim().charAt(0) || "A").toUpperCase()}
            </span>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900">{profile?.full_name || "Admin"}</p><p className="truncate text-xs text-gray-500">{profile?.email || ""}</p></div>
          </div>
          <a href="/admin/profile" aria-current={pathname === "/admin/profile" ? "page" : undefined} className={linkClass("/admin/profile")}><UserRound className="h-5 w-5" /><span>Profile</span></a>
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"><LogOut className="h-5 w-5" /><span>Logout</span></button>
        </div>
      </aside>
    </>
  );
}
