
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLoggedIn(!!session);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-white px-4 py-6 shadow-sm">
      <div className="mb-8 shrink-0 px-3">
        <h1 className="text-2xl font-bold text-blue-600">Novelle</h1>
        <p className="mt-1 text-xs text-gray-500">
          CST Student Platform
        </p>
      </div>

      <nav className="shrink-0">
        <a
          href="/"
          className="flex w-full items-center rounded-lg bg-blue-100 px-3 py-2.5 text-sm font-medium text-blue-700"
        >
          Home
        </a>
      </nav>

      <div className="mt-8 shrink-0">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Resources
        </p>

        <nav className="space-y-1">
          <a
            href="#"
            className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Notes
          </a>

          <a
            href="#"
            className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Past Papers
          </a>

          <a
            href="/submit-note"
            className="flex w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Upload Notes
          </a>
        </nav>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <p className="mb-2 shrink-0 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Programmes
        </p>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
          <a
            href="/programmes/civil-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Civil Engineering
          </a>

          <a
            href="/programmes/electrical-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Electrical Engineering
          </a>

          <a
            href="/programmes/ece"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Electronics and Communication Engineering (ECE)
          </a>

          <a
            href="/programmes/information-technology"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Information Technology (IT)
          </a>

          <a
            href="/programmes/architecture"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Architecture
          </a>

          <a
            href="/programmes/engineering-geology"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Engineering Geology
          </a>

          <a
            href="/programmes/instrumentation-and-control-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Instrumentation and Control Engineering (ICE)
          </a>

          <a
            href="/programmes/water-resources-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Water Resources Engineering (WRE)
          </a>

          <a
            href="/programmes/mechanical-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Mechanical Engineering
          </a>

          <a
            href="/programmes/software-engineering"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-blue-50"
          >
            Software Engineering
          </a>
        </nav>
      </div>

      <div className="mt-4 shrink-0 border-t pt-4">
        <a
          href="#"
          className="block w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
        >
          Settings
        </a>

        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        ) : (
          <a
            href="/login"
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50"
          >
            Login
          </a>
        )}
      </div>
    </aside>
  );
}

