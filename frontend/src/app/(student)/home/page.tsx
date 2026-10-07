"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Note = {
  id: number;
  title: string;
  programme_id: number;
  year: number;
  semester: number;
  file_path: string;
  created_at: string;
};

export default function Home() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  async function loadStudentData() {
    setLoading(true);

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

        if (userError || !user) {
      // Not logged in: send them to the login page.
      // replace() instead of push() so the Back button doesn't return here.
      router.replace("/login");
      return;
    }

    // Get student's profile
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name, programme_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      setLoading(false);
      return;
    }

    setFullName(profile.full_name);

    // Get approved notes for student's programme
    const {
      data: resources,
      error: resourcesError,
    } = await supabase
      .from("resources")
      .select(
        "id, title, programme_id, year, semester, file_path, created_at"
      )
      .eq("programme_id", profile.programme_id)
      .eq("type", "note")
      .order("created_at", { ascending: false });

    if (resourcesError) {
      console.error("Error fetching notes:", resourcesError);
      setLoading(false);
      return;
    }

    const loadedNotes = resources || [];

    setNotes(loadedNotes);

    // Get student's own likes
    const {
      data: favouriteData,
      error: favouriteError,
    } = await supabase
      .from("favourites")
      .select("resource_id")
      .eq("user_id", user.id);

    if (favouriteError) {
      console.error(
        "Error fetching favourites:",
        favouriteError
      );
    } else {
      setFavourites(
        (favouriteData || []).map(
          (item) => item.resource_id
        )
      );
    }

    // Get total like count for each note
    const counts: Record<number, number> = {};

    for (const note of loadedNotes) {
      const { data, error } = await supabase.rpc(
        "get_like_count",
        {
          p_resource_id: note.id,
        }
      );

      if (error) {
        console.error(
          `Error getting likes for note ${note.id}:`,
          error
        );

        counts[note.id] = 0;
      } else {
        counts[note.id] = Number(data) || 0;
      }
    }

    setLikeCounts(counts);

    setLoading(false);
  }

  // View note
  async function handleView(filePath: string) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error);
      alert("Unable to open this note.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  // Download note
  async function handleDownload(filePath: string) {
    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      console.error(
        "Error creating download URL:",
        error
      );
      alert("Unable to download this note.");
      return;
    }

    const link = document.createElement("a");

    link.href = data.signedUrl;
    link.download = "";
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Like / Unlike note
  async function handleFavourite(resourceId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to like a note.");
      return;
    }

    const isFavourite = favourites.includes(resourceId);

    if (isFavourite) {
      // Remove like
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);

      if (error) {
        console.error(
          "Error removing like:",
          error
        );

        alert("Unable to remove like.");
        return;
      }

      // Update liked notes
      setFavourites((current) =>
        current.filter(
          (id) => id !== resourceId
        )
      );

      // Decrease count
      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max(
          (current[resourceId] || 0) - 1,
          0
        ),
      }));
    } else {
      // Add like
      const { error } = await supabase
        .from("favourites")
        .insert({
          user_id: user.id,
          resource_id: resourceId,
        });

      if (error) {
        console.error(
          "Error adding like:",
          error
        );

        alert("Unable to like this note.");
        return;
      }

      // Update liked notes
      setFavourites((current) => [
        ...current,
        resourceId,
      ]);

      // Increase count
      setLikeCounts((current) => ({
        ...current,
        [resourceId]:
          (current[resourceId] || 0) + 1,
      }));
    }
  }

  return (
    <main className="min-h-full bg-gray-200 px-8 py-10">

        <div className="mx-auto max-w-7xl">

          {/* Welcome */}
          <div className="text-center">

            <h1 className="text-4xl font-bold text-gray-900">

              <span className="mr-2">
                👋
              </span>

              Welcome to{" "}

              <span className="text-blue-600">
                Novelle
              </span>

              {fullName && `, ${fullName}`}

            </h1>

            <p className="mt-2 text-gray-500">
              Find notes and learning resources from CST students.
            </p>

            {/* Search */}
            <div className="mx-auto mt-7 max-w-2xl">

              <input
                type="text"
                placeholder="Search notes, modules, programmes..."
                className="w-full rounded-2xl border border-black bg-white px-5 py-4 text-sm !text-black placeholder:!text-gray-500 shadow-md outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

            </div>

          </div>

          {/* Available Notes */}
          <div className="mt-12">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-semibold text-gray-900">
                  Available Notes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Browse recently available study materials.
                </p>

              </div>

              <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                View all →
              </button>

            </div>

            {/* Notes */}
            <div className="max-h-[520px] overflow-y-auto pr-3">

              {loading ? (

                <div className="py-10 text-center text-sm text-gray-500">
                  Loading notes...
                </div>

              ) : notes.length === 0 ? (

                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">

                  <p className="text-sm font-medium text-gray-700">
                    No notes available yet.
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Approved notes for your programme will appear here.
                  </p>

                </div>

              ) : (

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                  {notes.map((note) => {

                    const isFavourite =
                      favourites.includes(note.id);

                    const likes =
                      likeCounts[note.id] || 0;

                    return (

                      <div
                        key={note.id}
                        className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg "
                      >

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900">
                          {note.title}
                        </h3>

                        {/* Description */}
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Study note uploaded to Novelle.
                        </p>

                        {/* Year / Semester */}
                        <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">

                          <span>
                            Year {note.year}
                          </span>

                          <span>
                            Semester {note.semester}
                          </span>

                        </div>

                        {/* Buttons */}
                        <div className="mt-auto flex items-center gap-2 border-t pt-3">

                          <button
                            onClick={() =>
                              handleView(note.file_path)
                            }
                            className="flex-1 rounded-md bg-black px-2 py-2 text-xs font-medium text-white hover:bg-gray-700"
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              handleDownload(note.file_path)
                            }
                            className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Download
                          </button>

                          {/* Like */}
                          <button
  onClick={() => handleFavourite(note.id)}
  title={isFavourite ? "Unlike" : "Like"}
  className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
    isFavourite
      ? "border-red-200 bg-red-50 text-red-500"
      : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500"
  }`}
>
  {isFavourite ? (
    /* Filled Heart SVG */
    <svg xmlns="http://w3.org" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    /* Outline Heart SVG */
    <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )}

  <span className="text-xs leading-none">
    {likes}
  </span>
</button>


                        </div>

                      </div>

                    );
                  })}

                </div>

              )}

            </div>

          </div>

        </div>

      

    </main>
  );
}