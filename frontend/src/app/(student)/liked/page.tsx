"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// One row from favourites, with the liked resource (and its programme)
// joined in through the foreign keys.
type LikedItem = {
  id: number; // favourites.id — used to unlike
  created_at: string;
  resources: {
    id: number;
    title: string | null;
    topic: string;
    type: string;
    module_name: string | null;
    year: number | null;
    semester: number | null;
    file_path: string;
    programmes: { name: string } | null;
  } | null;
};

export default function LikedPage() {
  const router = useRouter();

  const [items, setItems] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLiked();
  }, []);

  async function loadLiked() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Start from favourites and pull in the resource it points to,
    // and that resource's programme name — all in one request.
    const { data, error } = await supabase
      .from("favourites")
      .select(
        "id, created_at, resources(id, title, topic, type, module_name, year, semester, file_path, programmes(name))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }); // most recently liked first

    if (error) {
      console.error("Load liked error:", error);
      setError("Could not load your liked notes.");
    } else {
      // If a resource was deleted or is not visible to this student,
      // "resources" comes back null — skip those.
      const rows = (data ?? []) as unknown as LikedItem[];
      setItems(rows.filter((row) => row.resources !== null));
    }

    setLoading(false);
  }

  async function openFile(filePath: string, download: boolean) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 60, download ? { download: true } : undefined);

    if (error || !data) {
      console.error("Open file error:", error);
      alert("Could not open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  // Unlike = delete this favourites row (allowed by the existing
  // "Users can remove their own favourites" policy), then drop it
  // from the list on screen without reloading everything.
  async function unlike(favouriteId: number) {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("id", favouriteId);

    if (error) {
      console.error("Unlike error:", error);
      alert("Could not remove this like.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== favouriteId));
  }

  return (
    <main className="min-h-full bg-gray-200 px-6 py-8 text-gray-900 md:px-10 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Liked
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Notes you have liked, from every programme, in one place.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500">
          Loading your liked notes...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center">
          <h3 className="text-lg font-semibold">No liked notes yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Tap the heart on any note and it will show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            // Safe: null resources were filtered out in loadLiked.
            const resource = item.resources!;

            return (
              <div
                key={item.id}
                className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-medium text-blue-600">
                  {resource.programmes?.name ?? "Unknown programme"}
                </p>

                {/* Admin uploads fill "topic"; approved submissions fill "title". */}
                <h3 className="mt-1 font-semibold">
                  {resource.title || resource.topic}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {resource.module_name ?? "Unknown module"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {resource.year ? `Year ${resource.year}` : ""}
                  {resource.year && resource.semester ? " · " : ""}
                  {resource.semester ? `Semester ${resource.semester}` : ""}
                </p>

                <div className="mt-auto flex gap-2 pt-5">
                  <button
                    onClick={() => openFile(resource.file_path, false)}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openFile(resource.file_path, true)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Download
                  </button>
                                    {/* Same filled heart as the note cards on /home */}
                  <button
                    onClick={() => unlike(item.id)}
                    title="Unlike"
                    className="flex w-12 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}