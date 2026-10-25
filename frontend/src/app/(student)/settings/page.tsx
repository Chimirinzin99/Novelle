"use client";

// Student Settings — Part 13c: "Upload updates" renamed "Pending updates".
// Part 13b: "Account security" uses the shared password
// rules (lib/password.ts) with the live checklist, and shows a gold notice
// when login found the current password too weak.
// Part 12: hard-coded colours switched to the theme colours.

import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Check,
  Eye,
  LockKeyhole,
  Monitor,
  Type,
} from "lucide-react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import {
  clearWeakPasswordFlag,
  hasWeakPasswordFlag,
  passwordMeetsRules,
  PASSWORD_RULES_MESSAGE,
  WEAK_PASSWORD_CODE,
} from "@/lib/password";
import PasswordChecklist from "@/components/PasswordChecklist";
import WeakPasswordNotice from "@/components/WeakPasswordNotice";

type FontSize = "small" | "default" | "large";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-soft focus-visible:ring-offset-2 ${checked ? "bg-navy" : "bg-slate-300"}`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200"
        style={{ left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-t border-line py-5 first:border-t-0">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-ink-soft">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inApp: true,
    uploadUpdates: true,
  });
  const [fontSize, setFontSize] = useState<FontSize>("default");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Part 13b: true when login found the password too weak
  const [weakPasswordNotice, setWeakPasswordNotice] = useState(false);

  useEffect(() => {
    setWeakPasswordNotice(hasWeakPasswordFlag());
    setPreferences(getNotificationPreferences());
    const savedFontSize = window.localStorage.getItem("novelle:font-size");
    if (savedFontSize === "small" || savedFontSize === "large") {
      setFontSize(savedFontSize);
    }
    const savedReduceMotion = window.localStorage.getItem("novelle:reduce-motion") === "true";
    setReduceMotion(savedReduceMotion);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem("novelle:font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
    window.localStorage.setItem("novelle:reduce-motion", String(reduceMotion));
  }, [reduceMotion]);

  function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    saveNotificationPreferences(next);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    // Shared rules (lib/password.ts) — was only "at least 8 characters"
    if (!passwordMeetsRules(password)) {
      setPasswordError(PASSWORD_RULES_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      setPasswordError(
        error.code === "same_password"
          ? "Your new password must be different from your old one."
          : error.code === WEAK_PASSWORD_CODE
            ? PASSWORD_RULES_MESSAGE
            : error.message
      );
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordMessage("Your password has been updated.");
    // Strong password saved: the weak-password notice can go.
    clearWeakPasswordFlag();
    setWeakPasswordNotice(false);
  }

  function dismissWeakPasswordNotice() {
    clearWeakPasswordFlag();
    setWeakPasswordNotice(false);
  }

  return (
    <main className="min-h-full bg-cream px-5 py-8 text-ink md:px-10 md:py-10 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-navy-soft">Preferences</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-ink-soft">Adjust how Novelle looks, keeps you updated, and protects your account.</p>
        </header>

        {/* Part 13b: shown after logging in with a password that breaks the rules */}
        {weakPasswordNotice && <WeakPasswordNotice onDismiss={dismissWeakPasswordNotice} />}

        <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm md:p-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-tint text-navy"><Monitor className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-ink-soft">Tune the interface for comfortable reading.</p></div>
          </div>
          <SettingRow title="Text size" description="Choose a comfortable reading size across the app.">
            <select value={fontSize} onChange={(event) => setFontSize(event.target.value as FontSize)} className="rounded-lg border border-sky-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20" aria-label="Text size">
              <option value="small">Small</option><option value="default">Default</option><option value="large">Large</option>
            </select>
          </SettingRow>
          <SettingRow title="Reduce motion" description="Limit animated transitions and movement.">
            <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion" />
          </SettingRow>
        </section>

        <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm md:p-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-tint text-navy"><Bell className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Notifications</h2><p className="text-sm text-ink-soft">Choose which updates appear in your notification menu.</p></div>
          </div>
          <SettingRow title="In-app notifications" description="Show updates in the bell menu.">
            <Toggle checked={preferences.inApp} onChange={(value) => updatePreference("inApp", value)} label="In-app notifications" />
          </SettingRow>
          {/* Part 13c: approved/rejected always show; this hides only "pending" */}
          <SettingRow title="Pending updates" description="Show when a resource you submitted is waiting for review. Approved and rejected updates always show.">
            <Toggle checked={preferences.uploadUpdates} onChange={(value) => updatePreference("uploadUpdates", value)} label="Pending updates" />
          </SettingRow>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-tint text-navy"><LockKeyhole className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Account security</h2><p className="text-sm text-ink-soft">Update your sign-in password.</p></div>
          </div>
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-sky-wash px-4 py-3 text-sm text-ink-soft"><Eye className="h-4 w-4 shrink-0 text-ink-soft" /> Signed in as <span className="font-medium text-ink">{email || "Loading account…"}</span></div>
          <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">New password<input type="password" autoComplete="new-password" aria-describedby="password-rules" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="mt-2 w-full rounded-xl border border-sky-line bg-white px-4 py-3 font-normal outline-none transition focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20" /></label>
            <label className="text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" className="mt-2 w-full rounded-xl border border-sky-line bg-white px-4 py-3 font-normal outline-none transition focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20" /></label>
            {/* Strength bar + rules (Part 13b), across both columns */}
            <div className="md:col-span-2"><PasswordChecklist password={password} id="password-rules" /></div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button type="submit" disabled={savingPassword} className="rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-60">{savingPassword ? "Updating…" : "Update password"}</button>
              {passwordMessage && <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700"><Check className="h-4 w-4" />{passwordMessage}</p>}
              {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
            </div>
          </form>
        </section>
        <p className="mt-5 flex items-center gap-2 text-xs text-ink-soft"><Type className="h-3.5 w-3.5" /> Your preferences are saved on this device.</p>
      </div>
    </main>
  );
}