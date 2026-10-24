import AdminSidebar from "@/components/AdminSidebar";

// Every /admin page is drawn inside this layout: navy sidebar + page area.
// Part 12: page background is the theme's cream (was slate-50).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream md:flex-row">
      <AdminSidebar />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}