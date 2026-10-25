import AdminSidebar from "@/components/AdminSidebar";
import PreviewProvider from "@/components/PreviewProvider";

// Every /admin page is drawn inside this layout: navy sidebar + page area.
// Part 12: page background is the theme's cream (was slate-50).
// PDF preview part: <PreviewProvider> lets every admin page open the
// PDF / video preview window (components/PreviewProvider.tsx).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreviewProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-cream md:flex-row">
        <AdminSidebar />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </PreviewProvider>
  );
}