"use client";

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
  NOTIFICATION_PREFERENCES_KEY,
  parseNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";
import { useStoredPreference, writeStoredPreference } from "@/lib/storedPreference";
import { supabase } from "@/lib/supabase";
import { setTheme, useTheme } from "@/lib/theme";

type FontSize = "small" | "default" | "large";

const FONT_SIZE_KEY = "novelle:font-size";
const REDUCE_MOTION_KEY = "novelle:reduce-motion";

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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#456FAD] focus-visible:ring-offset-2 ${checked ? "bg-[#294C78] dark:bg-[#3A649C]" : "bg-slate-300 dark:bg-slate-600"}`}
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
    <div className="flex items-center justify-between gap-5 border-t border-[#E7E5DF] dark:border-[#263345] py-5 first:border-t-0">
      <div>
        <p className="text-sm font-semibold text-[#24344D] dark:text-[#E5EAF1]">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-[#8B98AA]">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  // Saved on this device; read straight from storage so they are always current.
  const preferences = parseNotificationPreferences(
    useStoredPreference(NOTIFICATION_PREFERENCES_KEY)
  );
  const savedFontSize = useStoredPreference(FONT_SIZE_KEY);
  const fontSize: FontSize =
    savedFontSize === "small" || savedFontSize === "large" ? savedFontSize : "default";
  const reduceMotion = useStoredPreference(REDUCE_MOTION_KEY) === "true";
  const setFontSize = (value: FontSize) => writeStoredPreference(FONT_SIZE_KEY, value);
  const setReduceMotion = (value: boolean) =>
    writeStoredPreference(REDUCE_MOTION_KEY, String(value));
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  // Apply the text size and motion settings to the whole page.
  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    saveNotificationPreferences({ ...preferences, [key]: value });
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters for your new password.");
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
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordMessage("Your password has been updated.");
  }

  return (
    <main className="min-h-full bg-[#FCFBF8] dark:bg-[#0E141D] px-5 py-8 text-[#24344D] dark:text-[#E5EAF1] md:px-10 md:py-10 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#456FAD] dark:text-[#86A8DA]">Preferences</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-slate-500 dark:text-[#8B98AA]">Adjust how Novelle looks, keeps you updated, and protects your account.</p>
        </header>

        <section className="mb-6 rounded-2xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] p-5 shadow-sm md:p-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F8] dark:bg-[#1D2938] text-[#294C78] dark:text-[#9CB9E3]"><Monitor className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-slate-500 dark:text-[#8B98AA]">Tune the interface for comfortable reading.</p></div>
          </div>
          <SettingRow title="Text size" description="Choose a comfortable reading size across the app.">
            <select value={fontSize} onChange={(event) => setFontSize(event.target.value as FontSize)} className="rounded-lg border border-[#D9DFE8] dark:border-[#263345] bg-white dark:bg-[#172130] px-3 py-2 text-sm text-[#24344D] dark:text-[#E5EAF1] outline-none focus:border-[#456FAD] focus:ring-2 focus:ring-[#456FAD]/20" aria-label="Text size">
              <option value="small">Small</option><option value="default">Default</option><option value="large">Large</option>
            </select>
          </SettingRow>
          <SettingRow title="Dark mode" description="Use a darker colour scheme that is easier on the eyes at night.">
            <Toggle checked={theme === "dark"} onChange={(value) => setTheme(value ? "dark" : "light")} label="Dark mode" />
          </SettingRow>
          <SettingRow title="Reduce motion" description="Limit animated transitions and movement.">
            <Toggle checked={reduceMotion} onChange={setReduceMotion} label="Reduce motion" />
          </SettingRow>
        </section>

        <section className="mb-6 rounded-2xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] p-5 shadow-sm md:p-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F8] dark:bg-[#1D2938] text-[#294C78] dark:text-[#9CB9E3]"><Bell className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Notifications</h2><p className="text-sm text-slate-500 dark:text-[#8B98AA]">Choose which updates appear in your notification menu.</p></div>
          </div>
          <SettingRow title="In-app notifications" description="Show updates in the bell menu.">
            <Toggle checked={preferences.inApp} onChange={(value) => updatePreference("inApp", value)} label="In-app notifications" />
          </SettingRow>
          <SettingRow title="Upload updates" description="Notify me when a resource submission is received.">
            <Toggle checked={preferences.uploadUpdates} onChange={(value) => updatePreference("uploadUpdates", value)} label="Upload updates" />
          </SettingRow>
        </section>

        <section className="rounded-2xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F8] dark:bg-[#1D2938] text-[#294C78] dark:text-[#9CB9E3]"><LockKeyhole className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Account security</h2><p className="text-sm text-slate-500 dark:text-[#8B98AA]">Update your sign-in password.</p></div>
          </div>
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#F7F8FA] dark:bg-[#121A25] px-4 py-3 text-sm text-slate-600 dark:text-[#B4BFCD]"><Eye className="h-4 w-4 shrink-0 text-slate-400 dark:text-[#6B788A]" /> Signed in as <span className="font-medium text-[#24344D] dark:text-[#E5EAF1]">{email || "Loading account…"}</span></div>
          <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-[#D9DFE8] dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-3 font-normal outline-none transition focus:border-[#456FAD] focus:ring-2 focus:ring-[#456FAD]/20" /></label>
            <label className="text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" className="mt-2 w-full rounded-xl border border-[#D9DFE8] dark:border-[#263345] bg-white dark:bg-[#172130] px-4 py-3 font-normal outline-none transition focus:border-[#456FAD] focus:ring-2 focus:ring-[#456FAD]/20" /></label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button type="submit" disabled={savingPassword} className="rounded-xl bg-[#294C78] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203D63] disabled:cursor-not-allowed disabled:opacity-60">{savingPassword ? "Updating…" : "Update password"}</button>
              {passwordMessage && <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />{passwordMessage}</p>}
              {passwordError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            </div>
          </form>
        </section>
        <p className="mt-5 flex items-center gap-2 text-xs text-slate-400 dark:text-[#6B788A]"><Type className="h-3.5 w-3.5" /> Your preferences are saved on this device.</p>
      </div>
    </main>
  );
}
