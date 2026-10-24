"use client";

// Part 12: theme colours (navy button, pale-blue inputs, cream page) and
// the Novelle logo on top of the card. The login/sign-up code is unchanged.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { homePathForRole } from "@/lib/roles";
import Logo from "@/components/Logo";

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
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-sm">
        {/* Logo at the top of the card (links back to the landing page) */}
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-navy">
            Welcome to Novelle
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Sign in to access your CST resources
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink-nav">
              RUB Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@rub.edu.bt"
              required
              className="h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-ink-nav">
                Password
              </label>

              {/* Opens the page that emails a reset link */}
              <Link
                href="/reset-password"
                className="text-sm font-semibold text-navy-soft hover:text-navy hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-navy font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* Register */}
        <p className="mt-6 text-center text-sm text-ink-soft">
          Don't have an account?{" "}

          <Link
            href="/register"
            className="font-bold text-navy-soft hover:text-navy hover:underline"
          >
            Register
          </Link>
        </p>

      </div>
    </main>
  );
}