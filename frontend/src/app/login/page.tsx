"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import { homePathForRole } from "@/lib/roles";

// Shown when a super admin has deactivated this account (/admin/users).
const DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please contact the super admin.";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    // Remove accidental spaces and make email lowercase
    const cleanEmail = email.trim().toLowerCase();

    // Check RUB email
    if (!cleanEmail.endsWith("@rub.edu.bt")) {
      setError(
        "Please use your RUB email address, for example: yourname@rub.edu.bt"
      );
      setLoading(false);
      return;
    }

    // Login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      // A deactivated account is banned in Supabase Auth (Part 9), which
      // refuses the login with the code "user_banned".
      setError(
        error.code === "user_banned"
          ? DEACTIVATED_MESSAGE
          : error.message
      );
      setLoading(false);
      return;
    }

    // Make sure we have the logged-in user
    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Get the user's role from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      setError("Could not load your account information.");
      setLoading(false);
      return;
    }

    if (!profile) {
      setError("Your profile could not be found.");
      setLoading(false);
      return;
    }

    // Backup check: if the profile says deactivated but the ban didn't
    // stop the login, sign straight back out.
    if (!profile.is_active) {
      await supabase.auth.signOut();
      setError(DEACTIVATED_MESSAGE);
      setLoading(false);
      return;
    }

    // Redirect according to role (admins -> /admin, students -> /home).
    // The rule lives in lib/roles.ts so login and ExploreButton always agree.
    router.push(homePathForRole(profile.role));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0E141D] px-6">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle variant="icon" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-8 shadow-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E5EAF1]">
            Welcome to Novelle
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-[#8B98AA]">
            Sign in to access your CST resources
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
              RUB Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@rub.edu.bt"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] placeholder:text-gray-400 dark:placeholder:text-[#6B788A] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
                Password
              </label>

              {/* Opens the page that emails a reset link */}
              <a
                href="/reset-password"
                className="text-sm font-medium text-gray-500 dark:text-[#8B98AA] hover:text-black dark:hover:text-[#E5EAF1] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] placeholder:text-gray-400 dark:placeholder:text-[#6B788A] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black dark:bg-[#3A649C] py-3 font-medium text-white transition hover:bg-gray-800 dark:hover:bg-[#33598C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* Register */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-[#8B98AA]">
          Don&apos;t have an account?{" "}

          <a
            href="/register"
            className="font-medium text-black dark:text-[#E5EAF1] hover:underline"
          >
            Register
          </a>
        </p>

      </div>
    </main>
  );
}