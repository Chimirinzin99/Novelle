"use client";
// "use client" is needed because this button checks the login session,
// and the session is stored in the browser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ExploreButton() {
  // Start by pointing at /login. If the check below finds a session,
  // we switch to /home or /admin. So a logged-out visitor never sees a wrong link.
  const [href, setHref] = useState("/login");

  useEffect(() => {
    // Runs once, after the button first appears in the browser.
    // getSession() reads the saved session; it doesn't need the network.
        supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return; // logged out: keep /login

      // Same role check as the login page: admins go to /admin.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (
        profile?.role === "programme_admin" ||
        profile?.role === "super_admin"
      ) {
        setHref("/admin");
      } else {
        setHref("/home");
      }
    });
  }, []);

  return (
    <Link
      href={href}
      className="mt-10 rounded-xl bg-black px-10 py-3 text-base font-semibold text-white shadow-md transition hover:bg-gray-700"
    >
      Explore
    </Link>
  );
}
