import Sidebar from "@/components/Sidebar";
import PreviewProvider from "@/components/PreviewProvider";

// Every page inside app/(student)/ (home, programmes/**, submit-note)
// is rendered inside this layout. `children` is the page itself.
// PDF preview part: <PreviewProvider> lets every page and card open the
// PDF / video preview window (components/PreviewProvider.tsx).
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Full-screen row: sidebar on the left, page on the right.
    // overflow-hidden stops the whole window from scrolling…
    <PreviewProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        {/* …so only the page area scrolls, and the sidebar stays put.
            min-w-0 lets wide content shrink instead of pushing the page sideways. */}
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </PreviewProvider>
  );
}