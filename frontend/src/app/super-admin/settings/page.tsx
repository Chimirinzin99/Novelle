"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [programmeCount, setProgrammeCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
    }

    const { count: programmes } = await supabase
      .from("programmes")
      .select("*", { count: "exact", head: true });

    const { count: users } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    setProgrammeCount(programmes ?? 0);
    setUserCount(users ?? 0);
  }

  return (
    <div className="space-y-8 text-black">

      <div>
        <h1 className="text-4xl font-bold">
          Settings
        </h1>

        <p className="mt-2 text-gray-600">
          Manage the Novelle platform settings.
        </p>
      </div>

      {/* Account */}

      <div className="rounded-xl border bg-white p-6 shadow">

        <h2 className="mb-4 text-2xl font-semibold">
          Account
        </h2>

        <div className="space-y-4">

          <div>
            <p className="text-sm text-gray-500">
              Name
            </p>

            <p className="font-medium">
              {profile?.full_name ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>

            <p className="font-medium">
              {profile?.email ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Role
            </p>

            <span className="rounded bg-blue-100 px-3 py-1 text-blue-700">
              {profile?.role ?? "-"}
            </span>
          </div>

        </div>

      </div>

      {/* System */}

      <div className="rounded-xl border bg-white p-6 shadow">

        <h2 className="mb-4 text-2xl font-semibold">
          System Information
        </h2>

        <div className="grid grid-cols-2 gap-6">

          <div>
            <p className="text-gray-500">
              Platform
            </p>

            <p className="font-semibold">
              Novelle
            </p>
          </div>

          <div>
            <p className="text-gray-500">
              Version
            </p>

            <p className="font-semibold">
              1.0
            </p>
          </div>

          <div>
            <p className="text-gray-500">
              Database
            </p>

            <p className="font-semibold text-green-600">
              Connected
            </p>
          </div>

          <div>
            <p className="text-gray-500">
              Total Users
            </p>

            <p className="font-semibold">
              {userCount}
            </p>
          </div>

          <div>
            <p className="text-gray-500">
              Total Programmes
            </p>

            <p className="font-semibold">
              {programmeCount}
            </p>
          </div>

        </div>

      </div>

      {/* Quick Actions */}

      <div className="rounded-xl border bg-white p-6 shadow">

        <h2 className="mb-4 text-2xl font-semibold">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-4">

          <button
            onClick={loadData}
            className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Refresh Statistics
          </button>

          <button
            className="rounded bg-slate-700 px-5 py-2 text-white"
          >
            Export Database
          </button>

          <button
            className="rounded bg-green-700 px-5 py-2 text-white"
          >
            Backup System
          </button>

        </div>

      </div>

      {/* Danger Zone */}

      <div className="rounded-xl border border-red-300 bg-red-50 p-6">

        <h2 className="mb-4 text-2xl font-semibold text-red-700">
          Danger Zone
        </h2>

        <div className="flex gap-4">

          <button
            className="rounded bg-red-600 px-5 py-2 text-white"
          >
            Reset Analytics Cache
          </button>

          <button
            className="rounded bg-red-800 px-5 py-2 text-white"
          >
            Clear Logs
          </button>

        </div>

      </div>

    </div>
  );
}
