"use client";

// One student page that lists a programme's PDF resources of ONE type
// (notes, question papers or assignments): back link, header, filters,
// cards with View / Download / Like.
//
// The Notes, Question Papers and Assignments pages are each just
//   <ResourceList type="note" ... />
// with different words, so a fix made here fixes all three pages.
// (Videos keep their own page because their cards show YouTube thumbnails.)

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";
import { findProgrammeBySlug } from "@/lib/programmes";
import type { ResourceTypeCode } from "@/lib/resourceTypes";

type ResourceListProps = {
  // Which rows to show. Exclude<...> = any type code except "video".
  type: Exclude<ResourceTypeCode, "video">;
  heading: string; // "Notes"
  description: string; // line under the heading
  singular: string; // "note"   -> "1 note", "Unable to open this note."
  plural: string; // "notes"  -> "5 notes", "No notes found"
};

// One card's data, from the resources table.
type Resource = {
  id: number;
  name: string; // title (approved submissions) or topic (admin uploads)
  year: number;
  semester: number;
  module_name: string;
  file_path: string | null;
};

export default function ResourceList({
  type,
  heading,
  description,
  singular,
  plural,
}: ResourceListProps) {
  const params = useParams();

  // The slug from the URL, e.g. "information-technology"
  const programmeSlug = decodeURIComponent(params.programme as string);

  // The programme's real name, shown in the header once it has loaded.
  const [programme, setProgramme] = useState("");

  const [resources, setResources] = useState<Resource[]>([]);
  const [favourites, setFavourites] = useState<number[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [selectedModule, setSelectedModule] = useState("All Modules");

  useEffect(() => {
    fetchResources();
    // Reload when the student moves to another programme or type.
  }, [programmeSlug, type]);

  async function fetchResources() {
    setLoading(true);
    setError("");

    // 1. Find the programme whose slugified name matches the URL slug.
    const programmeData = await findProgrammeBySlug(programmeSlug);

    if (!programmeData) {
      setError(`Unable to find programme "${programmeSlug}".`);
      setLoading(false);
      return;
    }

    setProgramme(programmeData.name);

    // 2. This programme's resources of this type, newest first.
    const { data, error: loadError } = await supabase
      .from("resources")
      .select("id, title, topic, year, semester, module_name, file_path")
      .eq("programme_id", programmeData.id)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error(`Load ${plural} error:`, loadError);
      setError(`Unable to load ${plural}.`);
      setLoading(false);
      return;
    }

    const loaded: Resource[] = (data || []).map((item) => ({
      id: item.id,
      // Student submissions have a title; admin uploads only a topic.
      name: item.title || item.topic,
      year: item.year,
      semester: item.semester,
      module_name: item.module_name || "Unknown Module",
      file_path: item.file_path,
    }));

    setResources(loaded);

    // 3. Which of these the logged-in student has liked.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: favouriteData, error: favouriteError } = await supabase
        .from("favourites")
        .select("resource_id")
        .eq("user_id", user.id);

      if (favouriteError) {
        console.error("Favourite loading error:", favouriteError);
      } else {
        setFavourites((favouriteData || []).map((f) => f.resource_id));
      }
    }

    // 4. Total likes per resource. Promise.all starts all the calls at
    //    once and waits for every one, instead of one after another.
    const counts: Record<number, number> = {};

    await Promise.all(
      loaded.map(async (resource) => {
        const { data: likeCount, error: likeError } = await supabase.rpc(
          "get_like_count",
          { p_resource_id: resource.id }
        );

        counts[resource.id] = likeError ? 0 : Number(likeCount) || 0;
      })
    );

    setLikeCounts(counts);
    setLoading(false);
  }

  // A short-lived link to the private PDF. download: true makes the
  // browser save the file instead of opening it.
  async function openFile(filePath: string | null, download: boolean) {
    if (!filePath) {
      setError(`This ${singular} does not have a file.`);
      return;
    }

    const { data, error: urlError } = await supabase.storage
      .from("resources")
      .createSignedUrl(filePath, 3600, download ? { download: true } : {});

    if (urlError || !data?.signedUrl) {
      console.error("Signed URL error:", urlError);
      setError(`Unable to ${download ? "download" : "open"} this ${singular}.`);
      return;
    }

    if (download) {
      // A temporary <a> clicked in code starts the download.
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(data.signedUrl, "_blank");
    }
  }

  // Like / unlike.
  async function handleFavourite(resourceId: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(`Please log in to like a ${singular}.`);
      return;
    }

    if (favourites.includes(resourceId)) {
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

      setFavourites((current) => current.filter((id) => id !== resourceId));
      setLikeCounts((current) => ({
        ...current,
        [resourceId]: Math.max((current[resourceId] || 0) - 1, 0),
      }));
      return;
    }

    const { error: insertError } = await supabase
      .from("favourites")
      .insert({ user_id: user.id, resource_id: resourceId });

    if (insertError) {
      console.error("Add like error:", insertError);
      setError(`Unable to like this ${singular}.`);
      return;
    }

    setFavourites((current) => [...current, resourceId]);
    setLikeCounts((current) => ({
      ...current,
      [resourceId]: (current[resourceId] || 0) + 1,
    }));
  }

  // Module dropdown options, taken from the loaded resources.
  const modules = [...new Set(resources.map((r) => r.module_name))];

  const filtered = resources.filter((r) => {
    const yearMatch =
      selectedYear === "All Years" ||
      r.year.toString() === selectedYear.replace("Year ", "");

    const semesterMatch =
      selectedSemester === "All Semesters" ||
      r.semester.toString() === selectedSemester.replace("Semester ", "");

    const moduleMatch =
      selectedModule === "All Modules" || r.module_name === selectedModule;

    return yearMatch && semesterMatch && moduleMatch;
  });

  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }

  return (
    <main className="min-h-full bg-gray-200 text-gray-900">
      <section className="min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-12">
        {/* Back to the programme page */}
        <Link
          href={`/programmes/${encodeURIComponent(programmeSlug)}`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-sm font-medium text-blue-600">{programme}</p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
                {heading}
              </h1>

              <p className="mt-2 text-sm text-gray-500">{description}</p>
            </div>

            {!loading && (
              <div className="text-sm font-medium text-gray-500">
                {filtered.length} {filtered.length === 1 ? singular : plural}
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

        {/* Loading / empty / cards */}
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Loading {plural}...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              {/* Document icon */}
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-gray-900">
              No {plural} found
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
            {filtered.map((resource) => {
              const isFavourite = favourites.includes(resource.id);
              const likes = likeCounts[resource.id] || 0;

              return (
                <div
                  key={resource.id}
                  className="flex h-[210px] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Name (title or topic) */}
                  <h3 className="text-sm font-semibold text-gray-900">
                    {resource.name}
                  </h3>

                  {/* Module */}
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {resource.module_name}
                  </p>

                  {/* Year / Semester */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Year {resource.year}</span>
                    <span>Semester {resource.semester}</span>
                  </div>

                  {/* Buttons */}
                  <div className="mt-auto flex items-center gap-2 border-t pt-3">
                    <button
                      onClick={() => openFile(resource.file_path, false)}
                      className="flex-1 rounded-md bg-blue-600 px-2 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      View
                    </button>

                    <button
                      onClick={() => openFile(resource.file_path, true)}
                      className="flex-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Download
                    </button>

                    {/* Like: filled heart when liked, outline when not */}
                    <button
                      onClick={() => handleFavourite(resource.id)}
                      title={isFavourite ? "Unlike" : "Like"}
                      className={`flex h-9 w-14 items-center justify-center gap-1 rounded-md border transition ${
                        isFavourite
                          ? "border-red-200 bg-red-50 text-red-500"
                          : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isFavourite ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={isFavourite ? 0 : 2}
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                      </svg>

                      <span className="text-xs leading-none">{likes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}