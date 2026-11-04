import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import ThemeWatcher from "@/components/ThemeWatcher";

// next/font downloads these fonts at build time and serves them from our own
// site (no request to Google from the student's browser). Each one creates a
// CSS variable that globals.css uses for font-display / font-sans.

// Headings: Montserrat (same font as the "NOVELLE" wordmark in the designs).
const heading = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
});

// Body text: Source Sans 3 (easy to read at small sizes).
const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Novelle",
  description: "Notes and learning resources shared by CST students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script below adds class="dark"
    // before React starts, so React would otherwise warn that <html>'s
    // class differs from the server's.
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Dark mode part: apply the saved theme before the page is drawn */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeWatcher />
        {children}
      </body>
    </html>
  );
}