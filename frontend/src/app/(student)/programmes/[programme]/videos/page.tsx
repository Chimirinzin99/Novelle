
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { findProgramme } from "@/lib/programme";

type Video = {
  id: number;
  title: string;
  youtube_url: string;
  year: number | null;
  semester: number | null;
  module: {
    module_code: string;
    module_name: string;
  } | null;
};

export default function VideosPage() {
  const params = useParams();

  const programmeSlug = decodeURIComponent(
    params.programme as string
  );

  const programmeName = programmeSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      setError("");

      try {
        // Find the programme using short name OR full programme name
        const {
          data: programmeData,
          error: programmeError,
        } = await findProgramme(programmeSlug);

        if (programmeError || !programmeData) {
          console.error("Programme error:", programmeError);
          setError(`Programme "${programmeSlug}" not found.`);
          setLoading(false);
          return;
        }

        // Get videos for this programme
        const { data, error: videoError } = await supabase
          .from("videos")
          .select(`
            id,
            title,
            youtube_url,
            year,
            semester,
            module:modules (
              module_code,
              module_name
            )
          `)
          .eq("programme_id", programmeData.id)
          .order("created_at", {
            ascending: false,
          });

        if (videoError) {
          console.error("Video error:", videoError);
          setError("Unable to load videos.");
          setLoading(false);
          return;
        }

        setVideos((data || []) as unknown as Video[]);
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading videos.");
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [programmeSlug]);

  // Convert YouTube URL into an embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);

      // Normal YouTube URL
      // https://www.youtube.com/watch?v=VIDEO_ID
      if (
        parsedUrl.hostname === "youtube.com" ||
        parsedUrl.hostname === "www.youtube.com"
      ) {
        const videoId = parsedUrl.searchParams.get("v");

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }

        // YouTube Shorts
        const shortsMatch = parsedUrl.pathname.match(
          /\/shorts\/([^/]+)/
        );

        if (shortsMatch) {
          return `https://www.youtube.com/embed/${shortsMatch[1]}`;
        }
      }

      // Short YouTube URL
      // https://youtu.be/VIDEO_ID
      if (
        parsedUrl.hostname === "youtu.be" ||
        parsedUrl.hostname === "www.youtu.be"
      ) {
        const videoId = parsedUrl.pathname.substring(1);

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  return (
    <main className="min-h-full bg-gray-200 px-6 py-8 text-gray-900 md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-10">
          <Link
            href={`/programmes/${encodeURIComponent(programmeSlug)}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>

            Back to {programmeName}
          </Link>

          <p className="mb-3 text-sm font-medium text-red-600">
            Programmes / {programmeName} / Videos
          </p>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Related Videos
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
            Watch useful YouTube videos related to your
            programme, modules, and coursework.
          </p>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px bg-gray-300" />

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Loading videos...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <h2 className="text-xl font-semibold text-red-700">
              Unable to load videos
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* No videos */}
        {!loading && !error && videos.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                className="h-7 w-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.5 12L9 8.25v7.5L15.5 12z"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              No videos available
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Videos for this programme will appear here
              once an administrator adds them.
            </p>
          </div>
        )}

        {/* Videos */}
        {!loading && !error && videos.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {videos.map((video) => {
              const embedUrl = getYouTubeEmbedUrl(
                video.youtube_url
              );

              return (
                <div
                  key={video.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* YouTube */}
                  {embedUrl ? (
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        className="h-full w-full"
                        src={embedUrl}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-100">
                      <p className="text-sm text-gray-500">
                        Invalid YouTube URL
                      </p>
                    </div>
                  )}

                  {/* Video information */}
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {video.title}
                    </h2>

                    {video.module && (
                      <p className="mt-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">
                          Module:
                        </span>{" "}
                        {video.module.module_code} —{" "}
                        {video.module.module_name}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {video.year && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          Year {video.year}
                        </span>
                      )}

                      {video.semester && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          Semester {video.semester}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
