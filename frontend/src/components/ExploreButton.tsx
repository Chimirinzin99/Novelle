"use client";
// "use client" is needed because this button checks the login session,
// and the session is stored in the browser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { homePathForRole } from "@/lib/roles";

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

      // lib/roles.ts decides where each role lands (same rule as login).
      setHref(homePathForRole(profile?.role));
    });
  }, []);

  return (
    <Link
      href={href}
      className="mt-10 rounded-xl bg-black dark:bg-[#3A649C] px-10 py-3 text-base font-semibold text-white shadow-md transition hover:bg-gray-700 dark:hover:bg-[#33598C]"
    >
      Explore
    </Link>
  );
}