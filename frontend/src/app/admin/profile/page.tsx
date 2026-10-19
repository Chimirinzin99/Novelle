"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, ShieldCheck, GraduationCap, LockKeyhole, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdminRole, roleLabel } from "@/lib/roles";

type AdminProfile = {
  full_name: string | null;
  email: string | null;
  role: string;
  programmes: { name: string } | null;
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "A";
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, role, programmes(name)")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !data || !isAdminRole(data.role)) {
        if (data && !isAdminRole(data.role)) {
          router.replace("/home");
          return;
        }
        setError("Could not load your admin profile.");
      } else {
        setProfile({
          ...data,
          email: data.email || user.email || null,
          programmes: data.programmes as unknown as { name: string } | null,
        });
      }
      setLoading(false);
    }

    void loadProfile();
  }, [router]);

  const name = profile?.full_name?.trim() || "Admin";

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPasswordBusy(false);
    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Your password has been updated.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-gray-900 md:px-10 md:py-10">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-7 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <header className="mb-8">
          <p className="text-sm font-semibold text-blue-600">Admin workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">My profile</h1>
          <p className="mt-2 text-sm text-gray-500">Your account details and admin access.</p>
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-gray-500">Loading your profile…</p>
          ) : profile ? (
            <>
              <div className="flex items-center gap-5 border-b border-gray-100 pb-7">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-xl font-semibold text-white">
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">{name}</h2>
                  <p className="mt-1 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {roleLabel(profile.role)}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-gray-100">
                <div className="flex items-center gap-4 py-5">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</dt><dd className="mt-1 break-all text-sm font-medium text-gray-800">{profile.email || "No email available"}</dd></div>
                </div>
                <div className="flex items-center gap-4 py-5">
                  <ShieldCheck className="h-5 w-5 text-gray-400" />
                  <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Access level</dt><dd className="mt-1 text-sm font-medium text-gray-800">{roleLabel(profile.role)}</dd></div>
                </div>
                <div className="flex items-center gap-4 py-5">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                  <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Programme</dt><dd className="mt-1 text-sm font-medium text-gray-800">{profile.programmes?.name || "All programmes"}</dd></div>
                </div>
              </dl>
            </>
          ) : null}
        </section>

        {!loading && profile && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><LockKeyhole className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold text-gray-900">Change password</h2>
                <p className="mt-1 text-sm text-gray-500">Use at least 8 characters for your new password.</p>
              </div>
            </div>
            <form onSubmit={handlePasswordChange} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                New password
                <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Confirm new password
                <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button type="submit" disabled={passwordBusy} className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{passwordBusy ? "Updating…" : "Update password"}</button>
                {passwordSuccess && <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><Check className="h-4 w-4" />{passwordSuccess}</p>}
                {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
