import AdminSidebar from "@/components/AdminSidebar";
import PreviewProvider from "@/components/PreviewProvider";

// Every /admin page is drawn inside this layout: navy sidebar + page area.
// Part 12: page background is the theme's cream (was slate-50).
// PDF preview part: <PreviewProvider> lets every admin page open the
// PDF / video preview window (components/PreviewProvider.tsx).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreviewProvider>
      {/* Responsive part: a column, so on phones/tablets the sidebar's top bar
          sits above the page; on laptops (lg) the sidebar is fixed on the left
          and the page leaves room for it with lg:ml-72 (= the sidebar's w-72). */}
      <div className="flex h-screen flex-col overflow-hidden bg-cream">
        <AdminSidebar />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:ml-72">{children}</div>
      </div>
    </PreviewProvider>
  );
}
