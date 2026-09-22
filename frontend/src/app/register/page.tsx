
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

    // Check CST email
    const cleanEmail = email.trim().toLowerCase();

if (!cleanEmail.endsWith("@rub.edu.bt")) {
  setError(
    "Please use your RUB email address, for example: yourname@rub.edu.bt"
  );
  setLoading(false);
  return;
}

    // Check password
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    // Create Supabase account
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Create your Novelle account
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Register using your CST email
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              CST Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@cst.edu.bt"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black"
            />

            <p className="mt-1 text-xs text-gray-400">
              Minimum 6 characters
            </p>
          </div>

          {/* Programme */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Programme
            </label>

            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              required
              disabled={loadingProgrammes}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="" className="text-gray-500">
                {loadingProgrammes
                  ? "Loading programmes..."
                  : "Select your programme"}
              </option>

              {programmes.map((programme) => (
                <option
                  key={programme.id}
                  value={programme.id}
                  className="text-gray-900"
                >
                  {programme.name}
                </option>
              ))}
            </select>

            {/* Programme loading error */}
            {!loadingProgrammes &&
              programmes.length === 0 &&
              !error && (
                <p className="mt-2 text-xs text-red-500">
                  No programmes found in the database.
                </p>
              )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || loadingProgrammes}
            className="w-full rounded-lg bg-black py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-black hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}

