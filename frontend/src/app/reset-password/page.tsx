"use client";

// Reset password page — Part 13a: the new password must follow the shared
// rules (lib/password.ts) and shows the live checklist.
// Part 12: theme colours and the Novelle logo on top of the card.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import PasswordChecklist from "@/components/PasswordChecklist";
import { passwordMeetsRules, PASSWORD_RULES_MESSAGE } from "@/lib/password";

// /reset-password does two jobs:
//
// 1. "request" - someone forgot their password. They type their RUB email
//    and Supabase emails them a recovery link.
// 2. "update"  - they clicked that link. Supabase sends them back here with
//    a one-time login in the URL (#access_token=...&type=recovery). The
//    Supabase client reads it automatically and logs them in, so all we
//    have to do is let them choose a new password.
//
// For the link to come back HERE (not the home page), this URL must be in
// Supabase -> Authentication -> URL Configuration -> Redirect URLs.

type Mode = "checking" | "request" | "sent" | "update" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Decide which form to show when the page opens.
  useEffect(() => {
    const checkLink = async () => {
      const hash = window.location.hash;

      // An old or already-used link comes back with an error in the URL,
      // e.g. #error=access_denied&error_code=otp_expired&error_description=...
      if (hash.includes("error")) {
        setError(
          "This reset link is invalid or has expired. Enter your email to get a new one."
        );
        setMode("request");
        return;
      }

      const isRecoveryLink = hash.includes("type=recovery");

      // getSession() waits until the Supabase client has finished reading
      // the link in the URL, so by now the user is logged in if it worked.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isRecoveryLink && session) {
        setMode("update");
      } else {
        if (isRecoveryLink) {
          setError(
            "This reset link is invalid or has expired. Enter your email to get a new one."
          );
        }
        setMode("request");
      }
    };

    void checkLink();
  }, []);

  // Step 1: send the recovery email
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith("@rub.edu.bt")) {
      setError(
        "Please use your RUB email address, for example: yourname@rub.edu.bt"
      );
      return;
    }

    setLoading(true);

    const { error: requestError } = await supabase.auth.resetPasswordForEmail(
      cleanEmail,
      {
        // Where the link in the email should send them.
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (requestError) {
      // The free Supabase email service only sends a few emails per hour.
      setError(
        requestError.code === "over_email_send_rate_limit" ||
          requestError.message.toLowerCase().includes("rate limit")
          ? "Too many reset emails have been sent recently. Please wait a while and try again."
          : "Could not send the reset email. Please try again."
      );
      return;
    }

    // Same message whether or not the email has an account, so this page
    // can't be used to find out who is registered.
    setMode("sent");
  };

  // Step 2: save the new password
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Same rules as the register page (lib/password.ts)
    if (!passwordMeetsRules(password)) {
      setError(PASSWORD_RULES_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setLoading(false);
      setError(
        updateError.code === "same_password"
          ? "Your new password must be different from your old one."
          : updateError.code === "weak_password"
            ? PASSWORD_RULES_MESSAGE
            : updateError.message
      );
      return;
    }

    // Log out of the one-time session so they sign in with the new password.
    await supabase.auth.signOut();
    setLoading(false);
    setMode("done");
  };

  const inputClass =
    "h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint";

  const buttonClass =
    "h-12 w-full rounded-xl bg-navy font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-sm">
        {/* Logo at the top of the card (links back to the landing page) */}
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        {mode === "checking" && (
          <p className="text-center text-sm text-ink-soft">Checking link...</p>
        )}

        {/* Forgot password: ask for the email */}
        {mode === "request" && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-navy">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Enter your RUB email and we&apos;ll send you a link to choose a
                new password.
              </p>
            </div>

            <form onSubmit={handleRequest} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-ink-nav"
                >
                  RUB Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@rub.edu.bt"
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        {/* Email sent */}
        {mode === "sent" && (
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-navy">
              Check your email
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              If an account exists for{" "}
              <span className="font-medium text-ink">
                {email.trim().toLowerCase()}
              </span>
              , you&apos;ll get an email with a reset link. Open it on this
              device, in this browser.
            </p>
          </div>
        )}

        {/* Came from the email link: choose a new password */}
        {mode === "update" && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-navy">
                Choose a new password
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Pick a password that ticks every rule below.
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-ink-nav"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  required
                  className={inputClass}
                />

                {/* Strength bar + rules, ticked as the user types */}
                <PasswordChecklist password={password} id="password-rules" />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-ink-nav"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Saving..." : "Save new password"}
              </button>
            </form>
          </>
        )}

        {/* Password changed */}
        {mode === "done" && (
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-navy">
              Password updated
            </h1>
            <p className="mt-3 text-sm text-ink-soft">
              You can now log in with your new password.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={`mt-6 ${buttonClass}`}
            >
              Go to login
            </button>
          </div>
        )}

        {mode !== "done" && mode !== "checking" && (
          <p className="mt-6 text-center text-sm text-ink-soft">
            Remembered it?{" "}
            <a
              href="/login"
              className="font-bold text-navy-soft hover:text-navy hover:underline"
            >
              Back to login
            </a>
          </p>
        )}
      </div>
    </main>
  );
}