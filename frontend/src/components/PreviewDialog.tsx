"use client";

// components/PreviewDialog.tsx — PDF preview part: the window that shows a
// PDF or a YouTube video on top of the page (instead of a new tab).
// It only DRAWS; components/PreviewProvider.tsx decides what is open.
//
// - PDF: the browser's own PDF viewer in an <iframe> (zoom, pages, search).
//   Some phone browsers (iPhone Safari) show only page 1 inside a frame, so
//   small screens get a hint pointing to "Open in new tab".
// - Video: YouTube's privacy-friendly player (youtube-nocookie.com). Closing
//   the window removes the player, which stops the video.
// - Close: the X button, the Escape key, or a click on the dark background.

import { useEffect, useRef } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { youTubeWatchUrl } from "@/lib/youtube";

export type PreviewItem =
  | {
      kind: "pdf";
      title: string;
      url: string | null; // null while the link is being made
      error?: string;
      onDownload: () => void;
    }
  | { kind: "video"; title: string; videoId: string };

type PreviewDialogProps = {
  item: PreviewItem;
  onClose: () => void;
};

const barButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-line bg-white px-3 text-sm font-semibold text-navy outline-none transition hover:bg-sky-wash focus-visible:ring-2 focus-visible:ring-navy/40";

export default function PreviewDialog({ item, onClose }: PreviewDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus goes to the X when the window opens and back to
  // the button that opened it when it closes (keyboard users stay in place).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const isPdf = item.kind === "pdf";
  const externalUrl = isPdf ? item.url : youTubeWatchUrl(item.videoId);

  return (
    // Dark background: clicking it (not the window) closes.
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-2 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          isPdf ? "h-full max-w-5xl" : "max-w-4xl"
        }`}
      >
        {/* Top bar: title + actions */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <h2 id="preview-title" className="mr-auto line-clamp-1 min-w-0 text-base font-bold text-ink">
            {item.title}
          </h2>

          {isPdf && (
            <button type="button" onClick={item.onDownload} className={barButton}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </button>
          )}

          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={barButton}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {isPdf ? "Open in new tab" : "Open on YouTube"}
            </a>
          )}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg p-2 text-ink-soft outline-none transition hover:bg-sky-wash hover:text-navy focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isPdf ? (
          <>
            {/* Phones: some show only the first page in a frame */}
            <p className="border-b border-line bg-gold-tint px-4 py-2 text-xs text-gold-ink sm:hidden">
              Only the first page showing? Use “Open in new tab”.
            </p>

            <div className="relative min-h-0 flex-1 bg-sky-wash">
              {item.error ? (
                <p role="alert" className="p-6 text-sm text-red-700">{item.error}</p>
              ) : item.url ? (
                <iframe src={item.url} title={`${item.title} (PDF)`} className="h-full w-full border-0" />
              ) : (
                <p className="p-6 text-sm text-ink-soft">Loading PDF…</p>
              )}
            </div>
          </>
        ) : (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&rel=0`}
              title={`${item.title} (video)`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}