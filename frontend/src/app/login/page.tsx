"use client";

// Login page — Part 13e: logs in through the backend (POST /api/auth/login),
// which locks an email for 15 minutes after 5 wrong passwords in a row.
// While locked, the Login button is disabled and shows a countdown.
// The backend returns the session; supabase.auth.setSession() stores it, so
// everything after that works exactly as before.
// Part 13b: if the password used to log in breaks the new rules
// (an old 6-character password), the user is sent to the page where they can
// change it, with a notice. Login itself still works.
// Part 12: theme colours and the Novelle logo on top of the card.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { homePathForRole } from "@/lib/roles";
import {
  clearWeakPasswordFlag,
  markWeakPassword,
  passwordChangePathForRole,
  passwordMeetsRules,
} from "@/lib/password";
import Logo from "@/components/Logo";

// Part 13e: what POST /api/auth/login sends back
type LoginReply = {
  code?: string; // "account_locked", "user_banned", "invalid_credentials", …
  message?: string;
  locked_until?: string;
  session?: { access_token: string; refresh_token: string };
  weak_password?: boolean;
};

// Shown when a super admin has deactivated this account (/admin/users).
const DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please contact the super admin.";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Part 13e: lock from the backend — which email, and until when
  const [lock, setLock] = useState<{ email: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while locked (for the countdown on the button).
  useEffect(() => {
    if (!lock) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lock]);

  // The lock only applies to the email that was locked.
  const secondsLeft =
    lock && lock.email === email.trim().toLowerCase()
      ? Math.max(0, Math.ceil((lock.until - now) / 1000))
      : 0;
  const isLocked = secondsLeft > 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

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

    // Part 13e: log in through the backend (it counts wrong passwords).
    let result: LoginReply = {};
    try {
      const response = await callBackend(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      result = await readJson(response);

      if (!response.ok) {
        // Locked: remember until when, so the button can count down.
        if (result.code === "account_locked" && result.locked_until) {
          setLock({ email: cleanEmail, until: new Date(result.locked_until).getTime() });
          setNow(Date.now());
        }
        // A deactivated account is banned in Supabase Auth (Part 9).
        setError(
          result.code === "user_banned"
            ? DEACTIVATED_MESSAGE
            : result.message || "Login failed. Please try again."
        );
        setLoading(false);
        return;
      }
    } catch (loginError) {
      // Backend not running / restarting (lib/backend.ts message)
      setError(loginError instanceof Error ? loginError.message : "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    setLock(null);

    if (!result.session) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Store the session the backend got from Supabase. From here on the
    // browser is logged in, exactly as with signInWithPassword before.
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    if (sessionError) {
      console.error("Set session error:", sessionError);
      setError("Login failed. Please try again.");
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

    // Part 13b: weak password? Supabase tells us (weak_password, passed on
    // by the backend since 13e) when the
    // password breaks its rules; we also check it ourselves with the same
    // rules, in case Supabase doesn't send that field.
    if (result.weak_password || !passwordMeetsRules(password)) {
      markWeakPassword();
      router.push(passwordChangePathForRole(profile.role));
      return;
    }
    clearWeakPasswordFlag();

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
            disabled={loading || isLocked}
            className="h-12 w-full rounded-xl bg-navy font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : isLocked ? `Try again in ${countdown}` : "Login"}
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