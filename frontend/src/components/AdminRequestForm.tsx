"use client";

// Part 25: "Request admin access" for lecturers, on the student Profile page.
//
// Closed: a button. Open: choose a programme + optional note, then Send.
// Sending calls the backend (POST /api/auth/me/admin-request), which emails
// every super admin. Nothing is saved in the database (Option A): a super
// admin still makes the lecturer a programme admin on admin Users.
//
// "Request sent" is remembered only on this device (localStorage), so the
// lecturer doesn't send the same request twice by accident. The backend also
// allows only one request per 10 minutes.

import { FormEvent, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";
import { NOVELLE_CONTACT_EMAIL } from "@/lib/cstEmail";

const NOTE_MAX = 300; // same as the backend (auth.controller.ts)
const SENT_KEY = "novelle:admin-request-sent";

type Programme = { id: number; name: string };

type Props = {
  email: string; // used to remember "sent" per account on this device
  defaultProgrammeId: number | null;
};

function readSent(email: string): string | null {
  try {
    return localStorage.getItem(`${SENT_KEY}:${email}`);
  } catch {
    return null;
  }
}

function saveSent(email: string, when: string) {
  try {
    localStorage.setItem(`${SENT_KEY}:${email}`, when);
  } catch {
    // storage blocked: the button just shows again next time
  }
}

export default function AdminRequestForm({ email, defaultProgrammeId }: Props) {
  const [open, setOpen] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [programmeId, setProgrammeId] = useState<string>(defaultProgrammeId ? String(defaultProgrammeId) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- reads browser storage / the URL, which only exists after the page has mounted */
  useEffect(() => {
    setSentAt(readSent(email));
  }, [email]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function openForm() {
    setError("");
    setOpen(true);
    if (programmes.length > 0) return;

    const { data, error: loadError } = await supabase.from("programmes").select("id, name").order("name");
    if (loadError) {
      console.error("Load programmes error:", loadError);
      setError("Could not load the programmes. Please try again.");
      return;
    }
    setProgrammes(data ?? []);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!programmeId) {
      setError("Please choose a programme.");
      return;
    }

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in again.");

      const response = await callBackend(`${BACKEND_URL}/api/auth/me/admin-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ programme_id: Number(programmeId), note: note.trim() }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || "Could not send your request.");

      const now = new Date().toISOString();
      saveSent(email, now);
      setSentAt(now);
      setOpen(false);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  }

  if (sentAt && !open) {
    const day = new Date(sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return (
      <div className="mt-3">
        <p role="status" className="flex items-center gap-1.5 text-[15px] font-semibold text-emerald-700">
          <Check className="h-4 w-4" aria-hidden="true" /> Request sent on {day}.
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          A super admin will reply by email. Once they approve it, log out and in again to see the admin pages.
        </p>
        <button type="button" onClick={openForm} className="mt-2 text-sm font-semibold text-navy underline underline-offset-[3px]">
          Send another request
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={openForm}
          className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft"
        >
          Request admin access
        </button>
        <p className="mt-2 text-sm text-ink-soft">
          Or email{" "}
          <a href={`mailto:${NOVELLE_CONTACT_EMAIL}`} className="font-semibold text-navy underline underline-offset-[3px]">
            {NOVELLE_CONTACT_EMAIL}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:max-w-md">
      <label className="text-sm font-medium text-ink">
        Programme you want to manage
        <select
          required
          value={programmeId}
          onChange={(e) => setProgrammeId(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-sky-line bg-white px-4 py-2.5 font-normal outline-none transition focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20"
        >
          <option value="">Choose a programme</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-ink">
        Note (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          rows={3}
          placeholder="e.g. I teach MAT205 for second years"
          aria-describedby="admin-request-count"
          className="mt-1.5 w-full rounded-xl border border-sky-line bg-white px-4 py-2.5 font-normal outline-none transition focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20"
        />
        <span id="admin-request-count" className="mt-1 block text-right text-xs font-normal text-ink-soft">
          {note.length}/{NOTE_MAX}
        </span>
      </label>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="rounded-xl border border-sky-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-navy-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
