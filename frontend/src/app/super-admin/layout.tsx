"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export default function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 bg-slate-900 p-6 text-white">
        <Link
          href="/super-admin"
          className="text-2xl font-bold"
        >
          Novelle
        </Link>

        <p className="mt-2 text-sm text-slate-300">
          Super Admin Panel
        </p>

        <nav className="mt-10 flex flex-col gap-4 text-sm">
          <Link href="/super-admin">Dashboard</Link>
          <Link href="/super-admin/students">Students</Link>
          <Link href="/super-admin/administrators">
            Administrators
          </Link>
          <Link href="/super-admin/resources">Resources</Link>
          <Link href="/super-admin/submissions">Submissions</Link>
          <Link href="/super-admin/programmes">Programmes</Link>
          <Link href="/super-admin/analytics">Analytics</Link>
          <Link href="/super-admin/settings">Settings</Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-white p-6 text-black">
          <h1 className="text-xl font-bold text-black">
            Super Admin Dashboard
          </h1>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

