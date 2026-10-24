import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import "./globals.css";

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
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}