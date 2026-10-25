// Register page — Part 13a: stronger password rules (lib/password.ts) with a
// live checklist under the password box; sign-up uses the trimmed email;
// the confirmation link now opens /login (was the landing page).
// Part 12: theme colours and the Novelle logo on top of the card.

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import PasswordChecklist from "@/components/PasswordChecklist";
import { passwordMeetsRules, PASSWORD_RULES_MESSAGE } from "@/lib/password";

type Programme = {
  id: number;
  name: string;
};

export default function RegisterPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [programmeId, setProgrammeId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingProgrammes, setLoadingProgrammes] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load programmes from Supabase
  useEffect(() => {
    const loadProgrammes = async () => {
      setLoadingProgrammes(true);
      setError("");

      const { data, error } = await supabase
        .from("programmes")
        .select("id, name")
        .order("id");

      if (error) {
        console.error("Programme loading error:", error);
        setError(
          "Unable to load programmes. Please check your Supabase programmes table and RLS policy."
        );
        setLoadingProgrammes(false);
        return;
      }

      setProgrammes(data || []);
      setLoadingProgrammes(false);
    };

    loadProgrammes();
  }, []);

  // Register user
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    // Check all fields
    if (!fullName || !email || !password || !programmeId) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    // Check RUB email (spaces removed, lower case)
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith("@rub.edu.bt")) {
      setError(
        "Please use your RUB email address, for example: yourname@rub.edu.bt"
      );
      setLoading(false);
      return;
    }

    // Check password against the shared rules (lib/password.ts)
    if (!passwordMeetsRules(password)) {
      setError(PASSWORD_RULES_MESSAGE);
      setLoading(false);
      return;
    }

    // Create Supabase account
    const { error } = await supabase.auth.signUp({
      email: cleanEmail, // was email.toLowerCase() — spaces were not removed
      password: password,
      options: {
        // Link in the confirmation email opens the login page.
        // This URL must be in Supabase -> Authentication -> Redirect URLs.
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName,
          programme_id: programmeId,
        },
      },
    });

    if (error) {
      console.error("Registration error:", error);
      // Supabase checks the same rules; "weak_password" = a rule failed there.
      setError(
        error.code === "weak_password" ? PASSWORD_RULES_MESSAGE : error.message
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "Registration successful! Please check your RUB email (and the spam folder) and confirm your account before logging in."
    );

    // Clear form
    setFullName("");
    setEmail("");
    setPassword("");
    setProgrammeId("");

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-sm">
        {/* Logo at the top of the card (links back to the landing page) */}
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-navy">
            Create your Novelle account
          </h1>

          <p className="mt-2 text-sm text-ink-soft">
            Register using your RUB email
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="full-name" className="mb-2 block text-sm font-medium text-ink-nav">
              Full Name
            </label>

            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
            />
          </div>

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
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-nav">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              aria-describedby="password-rules"
              required
              className="h-12 w-full rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint"
            />

            {/* Strength bar + rules, ticked as the user types */}
            <PasswordChecklist password={password} id="password-rules" />
          </div>

          {/* Programme */}
          <div>
            <label htmlFor="programme" className="mb-2 block text-sm font-medium text-ink-nav">
              Programme
            </label>

            <select
              id="programme"
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              required
              disabled={loadingProgrammes}
              className="w-full h-12 rounded-xl border-2 border-sky-line bg-white px-4 text-base text-ink outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint disabled:cursor-not-allowed disabled:bg-sky-wash"
            >
              <option value="" className="text-ink-soft">
                {loadingProgrammes
                  ? "Loading programmes..."
                  : "Select your programme"}
              </option>

              {programmes.map((programme) => (
                <option
                  key={programme.id}
                  value={programme.id}
                  className="text-ink"
                >
                  {programme.name}
                </option>
              ))}
            </select>

            {/* Programme loading error */}
            {!loadingProgrammes &&
              programmes.length === 0 &&
              !error && (
                <p className="mt-2 text-xs text-red-600">
                  No programmes found in the database.
                </p>
              )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {success}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || loadingProgrammes}
            className="h-12 w-full rounded-xl bg-navy font-display text-[15px] font-bold tracking-wide text-white outline-none transition hover:bg-navy-soft focus-visible:ring-4 focus-visible:ring-sky-tint disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-bold text-navy-soft hover:text-navy hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}