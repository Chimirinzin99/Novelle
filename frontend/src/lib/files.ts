// lib/files.ts — PDF preview part: getting links to files in the private
// Storage bucket "resources", in one place (each page used to repeat this).
//
// A signed URL is a temporary link that works without logging in, for as
// long as we say (here 1 hour). Storage RLS (Part 11) still decides WHO may
// get one: published files, your own submissions, admins' review files.

import { supabase } from "@/lib/supabase";

const BUCKET = "resources";
const LINK_SECONDS = 60 * 60; // 1 hour: enough to read a PDF in the window

// Link for showing the PDF (download = false) or saving it (download = true).
// Returns null if Storage refuses (no permission, file missing).
export async function signedFileUrl(
  filePath: string,
  download = false
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, LINK_SECONDS, download ? { download: true } : undefined);

  if (error || !data?.signedUrl) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
}

// Starts a download of the file. Returns false if it couldn't.
export async function downloadFile(filePath: string): Promise<boolean> {
  const url = await signedFileUrl(filePath, true);
  if (!url) return false;

  // A temporary <a download> click saves the file without leaving the page.
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}