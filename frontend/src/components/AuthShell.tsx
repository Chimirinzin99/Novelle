// components/AuthShell.tsx — Part 21: the frame around the login, register
// and reset-password forms. On laptops the page is split in two: a CST photo
// on the left, the form on the right (on its own scroll, so the long register
// form never moves the photo). On phones and tablets the photo is hidden and
// only the form shows, so the form is the first thing on screen.
// Photos: College of Science and Technology (public/images/...).
//
// Usage: <AuthShell photo="/images/campus/students-walking.webp">…form…</AuthShell>

import Image from "next/image";

type AuthShellProps = {
  photo: string;
  position?: string; // which part of the photo stays visible (object-position)
  children: React.ReactNode;
};

export default function AuthShell({ photo, position = "center", children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen bg-cream">
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <Image
          src={photo}
          alt=""
          fill
          preload
          sizes="50vw"
          className="object-cover"
          style={{ objectPosition: position }}
        />
        {/* Navy fade at the bottom, behind the credit */}
        <div className="absolute inset-0 bg-gradient-to-t from-bar/80 via-bar/10 to-transparent" />
        <p className="absolute bottom-5 left-8 text-xs text-on-bar/80">
          Photo: College of Science and Technology
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:h-screen lg:overflow-y-auto">
        {children}
      </div>
    </main>
  );
}
