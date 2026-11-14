"use client";

// Part 24: "Edit name" on the student and admin Profile pages.
//
// Closed: a small "Edit name" button. Open: a text box + Save / Cancel.
// Saving calls the backend (PATCH /api/auth/me/name), not Supabase directly:
// profiles has no update policy on purpose (RLS can't limit which columns a
// user changes, so a policy would also let them change their own role).
//
// After a save, onSaved(newName) lets the page show the new name, and the
// NAME_CHANGED_EVENT tells other parts of the screen (the admin sidebar)
// to update without a page reload.

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";
import { callBackend, readJson } from "@/lib/backend";

export const NAME_CHANGED_EVENT = "novelle:name-changed";

// Same limits as the backend (auth.controller.ts). The backend is the real
// check; these just give a quicker message.
const MIN = 2;
const MAX = 60;

type Props = {
  currentName: string;
  onSaved: (newName: string) => void;
};

export default function EditNameForm({ currentName, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function startEditing() {
    setValue(currentName);
    setError("");
    setSaved(false);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = value.trim().replace(/\s+/g, " ");
    if (name.length < MIN || name.length > MAX) {
      setError(`Your name must be ${MIN} to ${MAX} characters.`);
      return;
    }
    if (name === currentName) {
      setOpen(false);
      return;
    }

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in again.");

      const response = await callBackend(`${BACKEND_URL}/api/auth/me/name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ full_name: name }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || "Could not save your name.");

      onSaved(data.full_name);
      window.dispatchEvent(new CustomEvent(NAME_CHANGED_EVENT, { detail: data.full_name }));
      setOpen(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startEditing}
          className="text-sm font-semibold text-navy-soft underline-offset-4 hover:underline"
        >
          Edit name
        </button>
        {saved && <p role="status" className="text-sm text-green-700">Name saved.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor="edit-full-name" className="sr-only">Your name</label>
      <input
        id="edit-full-name"
        type="text"
        autoComplete="name"
        autoFocus
        maxLength={MAX}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-64 max-w-full rounded-md border border-sky-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-navy-soft focus:ring-2 focus:ring-navy-soft/20"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(false)}
        className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
      >
        Cancel
      </button>
      {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
