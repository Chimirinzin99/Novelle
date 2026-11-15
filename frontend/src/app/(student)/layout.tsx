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
    // Full screen. overflow-hidden stops the whole window from scrolling…
    // Responsive part: a column, so on phones/tablets the Sidebar's top bar
    // sits above the page; on laptops (lg) the sidebar is fixed on the left
    // and the page leaves room for it with lg:ml-72 (= the sidebar's w-72).
    <PreviewProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Sidebar />

        {/* …so only the page area scrolls, and the sidebar stays put.
            min-w-0 lets wide content shrink instead of pushing the page sideways. */}
        {/* Part 20: `relative` makes this scrolling area the reference point for
            absolutely positioned bits inside pages, like the hidden screen-reader
            labels (sr-only) in the password checklist. Without it they were placed
            against the whole page, made the window itself scrollable and left a
            big blank space under Settings. */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto lg:ml-72">{children}</div>
      </div>
    </PreviewProvider>
  );
}
