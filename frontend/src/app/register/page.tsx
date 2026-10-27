
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import CstEmailHint from "@/components/CstEmailHint";
import {
  CST_EMAIL_ERROR,
  isCstEmail,
  MIN_PASSWORD_LENGTH,
  STUDENT_EMAIL_EXAMPLE,
} from "@/lib/authRules";

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

    // CST email: student ID for students, name for lecturers
    const cleanEmail = email.trim().toLowerCase();

    if (!isCstEmail(cleanEmail)) {
      setError(CST_EMAIL_ERROR);
      setLoading(false);
      return;
    }

    // Check password
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      setLoading(false);
      return;
    }

    // Create Supabase account
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
  emailRedirectTo: `${window.location.origin}/`,
  data: {
    full_name: fullName,
    programme_id: programmeId,
  },
},
    });

    if (error) {
      console.error("Registration error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(
      "Registration successful! Please check your CST email and confirm your account before logging in."
    );

    // Clear form
    setFullName("");
    setEmail("");
    setPassword("");
    setProgrammeId("");

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0E141D] px-6 py-10">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle variant="icon" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#263345] bg-white dark:bg-[#172130] p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E5EAF1]">
            Create your Novelle account
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-[#8B98AA]">
            Register using your CST email
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] placeholder:text-gray-400 dark:placeholder:text-[#6B788A] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
              CST Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={STUDENT_EMAIL_EXAMPLE}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] placeholder:text-gray-400 dark:placeholder:text-[#6B788A] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
            />

            <CstEmailHint email={email} />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] placeholder:text-gray-400 dark:placeholder:text-[#6B788A] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400"
            />

            <PasswordStrengthMeter password={password} />
          </div>

          {/* Programme */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-[#B4BFCD]">
              Programme
            </label>

            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              required
              disabled={loadingProgrammes}
              className="w-full rounded-lg border border-gray-300 dark:border-[#33445A] bg-white dark:bg-[#172130] px-4 py-3 text-gray-900 dark:text-[#E5EAF1] outline-none focus:border-black dark:focus:border-slate-400 focus:ring-1 focus:ring-black dark:focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-[#1D2938]"
            >
              <option value="" className="text-gray-500 dark:text-[#8B98AA]">
                {loadingProgrammes
                  ? "Loading programmes..."
                  : "Select your programme"}
              </option>

              {programmes.map((programme) => (
                <option
                  key={programme.id}
                  value={programme.id}
                  className="text-gray-900 dark:text-[#E5EAF1]"
                >
                  {programme.name}
                </option>
              ))}
            </select>

            {/* Programme loading error */}
            {!loadingProgrammes &&
              programmes.length === 0 &&
              !error && (
                <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                  No programmes found in the database.
                </p>
              )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || loadingProgrammes}
            className="w-full rounded-lg bg-black dark:bg-[#3A649C] py-3 font-medium text-white transition hover:bg-gray-800 dark:hover:bg-[#33598C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-[#8B98AA]">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-black dark:text-[#E5EAF1] hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}

