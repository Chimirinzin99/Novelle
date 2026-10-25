"use client";

// components/PreviewProvider.tsx — PDF preview part: makes the preview
// window available to EVERY page and card, without each page keeping its
// own copy. It wraps the student layout and the admin layout.
//
// Any component inside can do:
//   const { openPdf, openVideo } = usePreview();
//   openPdf(resource.file_path, "Unit 3 notes");
//   openVideo(resource.video_id, "Intro lecture");
//
// This is React "context": a value placed high up in the tree that any
// component below can read, instead of passing it down through every prop.

import { createContext, useCallback, useContext, useState } from "react";
import PreviewDialog, { type PreviewItem } from "@/components/PreviewDialog";
import { downloadFile, signedFileUrl } from "@/lib/files";
import { youTubeWatchUrl } from "@/lib/youtube";

type PreviewContextValue = {
  openPdf: (filePath: string, title: string) => void;
  openVideo: (videoId: string, title: string) => void;
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

export default function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<PreviewItem | null>(null);

  const close = useCallback(() => setItem(null), []);

  const openPdf = useCallback((filePath: string, title: string) => {
    const onDownload = () => {
      void downloadFile(filePath).then((ok) => {
        if (!ok) alert("Could not download this file.");
      });
    };

    // Open the window straight away ("Loading PDF…"), then add the link.
    setItem({ kind: "pdf", title, url: null, onDownload });

    void signedFileUrl(filePath).then((url) => {
      setItem((current) =>
        // Only fill it in if the user hasn't closed or switched meanwhile.
        current?.kind === "pdf" && current.title === title && current.url === null
          ? url
            ? { ...current, url }
            : { ...current, error: "Could not open this file. You may not have access to it, or it was removed." }
          : current
      );
    });
  }, []);

  const openVideo = useCallback((videoId: string, title: string) => {
    setItem({ kind: "video", title, videoId });
  }, []);

  return (
    <PreviewContext.Provider value={{ openPdf, openVideo }}>
      {children}
      {item && <PreviewDialog item={item} onClose={close} />}
    </PreviewContext.Provider>
  );
}

// The hook pages and cards use. Outside a PreviewProvider (shouldn't
// happen) it falls back to the old behaviour: a new tab.
export function usePreview(): PreviewContextValue {
  const value = useContext(PreviewContext);
  if (value) return value;

  return {
    openPdf: (filePath) => {
      void signedFileUrl(filePath).then((url) => url && window.open(url, "_blank", "noopener,noreferrer"));
    },
    openVideo: (videoId) => {
      window.open(youTubeWatchUrl(videoId), "_blank", "noopener,noreferrer");
    },
  };
}