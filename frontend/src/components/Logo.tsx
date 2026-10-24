import Image from "next/image";
import Link from "next/link";

// The Novelle logo: the "N + star" mark, the NOVELLE wordmark and a tagline.
// One component so every page (student sidebar, admin sidebar, landing page,
// login) shows the same logo.
//
//   tone="light" — on cream/white backgrounds (default)
//   tone="dark"  — on the navy admin sidebar: the mark sits in a cream tile
//                  (a navy "N" on navy would disappear) and the text is white
//   tagline      — the small line under NOVELLE (e.g. "Programme admin")
//   href         — makes the whole logo a link (e.g. to /home)

type LogoProps = {
  tone?: "light" | "dark";
  tagline?: string;
  href?: string;
};

export default function Logo({
  tone = "light",
  tagline = "Share · Learn · Grow",
  href,
}: LogoProps) {
  const dark = tone === "dark";

  const content = (
    <span className="flex items-center gap-3">
      {/* novelle-mark.png is the logo cropped to a square, background removed */}
      <span
        className={
          dark
            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream"
            : "flex h-11 w-11 shrink-0 items-center justify-center"
        }
      >
        <Image
          src="/novelle-mark.png"
          alt=""
          width={dark ? 32 : 44}
          height={dark ? 32 : 44}
          priority
        />
      </span>

      <span className="flex flex-col gap-0.5">
        <span
          className={`font-display text-base font-bold tracking-[0.14em] ${
            dark ? "text-white" : "text-navy"
          }`}
        >
          NOVELLE
        </span>
        <span
          className={`font-display text-[11px] font-medium tracking-wide ${
            dark ? "text-[#C9D8EE]" : "text-muted-blue"
          }`}
        >
          {tagline}
        </span>
      </span>
    </span>
  );

  // The alt text is on the link, so screen readers hear "Novelle home".
  return href ? (
    <Link href={href} aria-label="Novelle home" className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}