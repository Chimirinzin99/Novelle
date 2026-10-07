"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";

type Note = {
  id: number;
  topic: string;
  year: number;
  semester: number;
  module_name: string;
  file_path: string | null;
};

export default function NotesPage() {
  const params = useParams();

  const programmeSlug = decodeURIComponent(
    params.programme as string
  );

  const programme = programmeSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const [notes, setNotes] = useState<Note[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] =
    useState("All Semesters");
  const [selectedModule, setSelectedModule] =
    useState("All Modules");

  useEffect(() => {
    fetchNotes();
  }, [programme]);

  async function fetchNotes() {
    setLoading(true);
    setError("");

    // Find programme
    const { data: programmeData, error: programmeError } =
      await supabase
        .from("programmes")
        .select("id, name")
        .eq("name", programme)
        .single();

    if (programmeError || !programmeData) {
      console.error("Programme error:", programmeError);

      setError(`Unable to find programme "${programme}".`);
      setLoading(false);
      return;
    }

    // Get notes for this programme
    const { data, error: notesError } = await supabase
      .from("resources")
      .select(
        "id, topic, year, semester, module_name, file_path, type, programme_id"
      )
      .eq("programme_id", programmeData.id)
      .eq("type", "note")
      .order("created_at", {
        ascending: false,
      });

    if (notesError) {
      console.error("Notes error:", notesError);

      setError("Unable to load notes.");
      setLoading(false);
      return;
    }

    const formattedNotes: Note[] = (data || []).map((item: any) => ({
      id: item.id,
      topic: item.topic,
      year: item.year,
      semester: item.semester,
      module_name: item.module_name || "Unknown Module",
      file_path: item.file_path,
    }));

    setNotes(formattedNotes);

    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("User error:", userError);
    }

    // Load this user's likes
    if (user) {
      const { data: favouriteData, error: favouriteError } =
        await supabase
          .from("favourites")
          .select("resource_id")
          .eq("user_id", user.id);

      if (favouriteError) {
        console.error(
          "Favourite loading error:",
          favouriteError
        );
      } else {
        setFavourites(
          (favouriteData || []).map(
            (item) => item.resource_id
          )
        );
      }
    }

    // Load total likes for each note
    const counts: Record<number, number> = {};

    for (const note of formattedNotes) {
      const { data: likeCount, error: likeError } =
        await supabase.rpc("get_like_count", {
          p_resource_id: note.id,
        });

      if (likeError) {
        console.error(
          `Error getting likes for note ${note.id}:`,
          likeError
        );

        counts[note.id] = 0;
      } else {
        counts[note.id] = Number(likeCount) || 0;
      }
    }

    setLikeCounts(counts);
    setLoading(false);
  }

  // View note
  async function handleViewNote(filePath: string | null) {
    if (!filePath) {
      setError("This note does not have a file.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error("View error:", error);

      setError("Unable to open this note.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  // Download note
  async function handleDownloadNote(filePath: string | null) {
    if (!filePath) {
      setError("This note does not have a file.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      console.error("Download error:", error);

      setError("Unable to download this note.");
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in to like a note.");
      return;
    }

    const isFavourite = favourites.includes(resourceId);

    // Unlike
    if (isFavourite) {
      const { error: deleteError } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);

      if (deleteError) {
        console.error("Remove like error:", deleteError);

        setError("Unable to remove like.");
        return;
      }

      setFavourites((current) =>
        current.filter((id) => id !== resourceId)
      );

      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max(
          (current[resourceId] || 0) - 1,
          0
        ),
      }));

      return;
    }

    // Like
    const { error: insertError } = await supabase
      .from("favourites")
      .insert({
        user_id: user.id,
        resource_id: resourceId,
      });

    if (insertError) {
      console.error("Add like error:", insertError);

      setError("Unable to like this note.");
      return;
    }

    setFavourites((current) => [
      ...current,
      resourceId,
    ]);

    setLikeCounts((current) => ({
      ...current,
      [resourceId]:
        (current[resourceId] || 0) + 1,
    }));
  }

  // Module dropdown options, taken from the loaded notes
  const modules = [...new Set(notes.map((note) => note.module_name))];

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const yearMatch =
      selectedYear === "All Years" ||
      note.year.toString() ===
        selectedYear.replace("Year ", "");

    const semesterMatch =
      selectedSemester === "All Semesters" ||
      note.semester.toString() ===
        selectedSemester.replace("Semester ", "");

    const moduleMatch =
      selectedModule === "All Modules" ||
      note.module_name === selectedModule;

    return yearMatch && semesterMatch && moduleMatch;
  });

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  return (
    <main className="min-h-full bg-gray-200 text-gray-900">

        {/* Main Content */}
        <section className="min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-12">

          {/* Back */}
          <Link
            href={`/programmes/${encodeURIComponent(
              programmeSlug
            )}`}
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Back
          </Link>

          {/* Header */}
          <div className="mb-10">
            <p className="text-sm font-medium text-blue-600">
              {programme}
            </p>

            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
                  Notes
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  Browse approved study notes for your modules.
                </p>
              </div>

              {!loading && (
                <div className="text-sm font-medium text-gray-500">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1
                    ? "note"
                    : "notes"}
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <FilterBar
            year={selectedYear}
            onYearChange={setSelectedYear}
            semester={selectedSemester}
            onSemesterChange={setSelectedSemester}
            modules={modules}
            module={selectedModule}
            onModuleChange={setSelectedModule}
            onClear={clearFilters}
          />

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-sm text-gray-500">
                Loading notes...
              </p>
            </div>
          )}

          {/* Notes */}
          {!loading && (
            <>
              {filteredNotes.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-7 w-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292"
                      />
                    </svg>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-gray-900">
                    No notes found
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Try changing your filters or check back later.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="mt-6 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                  {filteredNotes.map((note) => {
                    const isFavourite =
                      favourites.includes(note.id);

                    const likes =
                      likeCounts[note.id] || 0;

                    return (
                      <div
                        key={note.id}
                        className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >

                        {/* Topic */}
                        <h3 className="text-sm font-semibold text-gray-900">
                          {note.topic}
                        </h3>

                        {/* Module */}
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {note.module_name}
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

                          {/* View */}
                          <button
                            onClick={() =>
                              handleViewNote(
                                note.file_path
                              )
                            }
                            className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            View
                          </button>

                          {/* Download */}
                          <button
                            onClick={() =>
                              handleDownloadNote(
                                note.file_path
                              )
                            }
                            className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Download
                          </button>

                          {/* Like */}
                          <button
                            onClick={() =>
                              handleFavourite(note.id)
                            }
                            title={
                              isFavourite
                                ? "Unlike"
                                : "Like"
                            }
                            className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                              isFavourite
                                ? "border-red-200 bg-red-50 text-red-500"
                                : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500"
                            }`}
                          >
                            <span className="flex h-4 w-4 items-center justify-center">

                              {isFavourite ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-4 w-4"
                                >
                                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                              ) : (
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
                                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                  />
                                </svg>
                              )}

                            </span>

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
            </>
          )}

        </section>
    </main>
  );
}