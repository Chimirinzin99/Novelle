

"use client";


// Shared resource list for Notes, Question Papers and Assignments.
// Handles fetching, filters, PDF viewing/downloading and favourites.


import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FilterBar from "@/components/FilterBar";
import { findProgrammeBySlug } from "@/lib/programmes";
import type { ResourceTypeCode } from "@/lib/resourceTypes";


type ResourceListProps = {
  type: Exclude<ResourceTypeCode, "video">;
  heading: string;
  description: string;
  singular: string;
  plural: string;
};


type Resource = {
  id: number;
  name: string;
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
  const programmeSlug = decodeURIComponent(params.programme as string);


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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeSlug, type]);


  async function fetchResources() {
    setLoading(true);
    setError("");


    const programmeData = await findProgrammeBySlug(programmeSlug);


    if (!programmeData) {
      setError(`Unable to find programme "${programmeSlug}".`);
      setLoading(false);
      return;
    }


    setProgramme(programmeData.name);


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
      name: item.title || item.topic,
      year: item.year,
      semester: item.semester,
      module_name: item.module_name || "Unknown Module",
      file_path: item.file_path,
    }));


    setResources(loaded);


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
    } else {
      setFavourites([]);
    }


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


  async function openFile(filePath: string | null, download: boolean) {
    if (!filePath) {
      setError(`This ${singular} does not have a file.`);
      return;
    }


    const { data, error: urlError } = await supabase.storage
      .from("resources")
      .createSignedUrl(
        filePath,
        3600,
        download ? { download: true } : {}
      );


    if (urlError || !data?.signedUrl) {
      console.error("Signed URL error:", urlError);
      setError(
        `Unable to ${download ? "download" : "open"} this ${singular}.`
      );
      return;
    }


    if (download) {
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }


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


      setFavourites((current) =>
        current.filter((id) => id !== resourceId)
      );


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


  const modules = [...new Set(resources.map((r) => r.module_name))];


  const filtered = resources.filter((resource) => {
    const yearMatch =
      selectedYear === "All Years" ||
      resource.year?.toString() === selectedYear.replace("Year ", "");


    const semesterMatch =
      selectedSemester === "All Semesters" ||
      resource.semester?.toString() ===
        selectedSemester.replace("Semester ", "");


    const moduleMatch =
      selectedModule === "All Modules" ||
      resource.module_name === selectedModule;


    return yearMatch && semesterMatch && moduleMatch;
  });


  function clearFilters() {
    setSelectedYear("All Years");
    setSelectedSemester("All Semesters");
    setSelectedModule("All Modules");
  }


  return (
    <main className="min-h-full bg-[#FCFBF8] text-[#24344D]">
      <section className="min-w-0 flex-1 px-5 py-7 md:px-10 md:py-9 lg:px-12">
        {/* Back navigation */}
        <Link
          href={`/programmes/${encodeURIComponent(programmeSlug)}`}
          className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[#E7E5DF] bg-white px-4 py-2.5 text-sm font-medium text-[#294C78] shadow-sm transition hover:border-[#C8D5E7] hover:bg-[#E7EEF8] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to programme
        </Link>


        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#456FAD]">
            {programme || "Loading programme…"}
          </p>


          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#24344D] md:text-4xl">
                {heading}
              </h1>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>


            {!loading && (
              <span className="inline-flex w-fit items-center rounded-full border border-[#E7E5DF] bg-white px-3 py-1.5 text-sm font-medium text-[#294C78]">
                {filtered.length}{" "}
                {filtered.length === 1 ? singular : plural}
              </span>
            )}
          </div>
        </div>


        {/* Filters */}
        <div className="mb-6">
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
        </div>


        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}


        {/* Loading, empty state, or resources */}
        {loading ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#D9E3F2] border-t-[#294C78]" />
            <p className="text-sm text-slate-500">
              Loading {plural}…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5DF] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7EEF8] text-[#294C78]">
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


            <h2 className="mt-5 text-lg font-semibold text-[#24344D]">
              No {plural} found
            </h2>


            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are no matching {plural} for these filters yet. Try
              changing your selections or check back later.
            </p>


            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-xl bg-[#294C78] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203B60] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30 focus:ring-offset-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((resource) => {
              const isFavourite = favourites.includes(resource.id);
              const likes = likeCounts[resource.id] || 0;


              return (
                <article
                  key={resource.id}
                  className="group flex min-h-[215px] flex-col rounded-2xl border border-[#E7E5DF] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D5E7] hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7EEF8] text-[#294C78]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.6}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>


                    <span className="rounded-full bg-[#F5F3EE] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Year {resource.year}
                    </span>
                  </div>


                  <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#24344D]">
                    {resource.name}
                  </h3>


                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                    {resource.module_name}
                  </p>


                  <div className="mt-3 text-xs text-slate-400">
                    Semester {resource.semester}
                  </div>


                  <div className="mt-auto flex items-center gap-2 border-t border-[#F0EEE8] pt-4">
                    <button
                      type="button"
                      onClick={() => openFile(resource.file_path, false)}
                      className="flex-1 rounded-lg bg-[#294C78] px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203B60] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30"
                    >
                      View
                    </button>


                    <button
                      type="button"
                      onClick={() => openFile(resource.file_path, true)}
                      className="flex-1 rounded-lg border border-[#D9DEE7] bg-white px-2 py-2.5 text-xs font-semibold text-[#294C78] transition hover:bg-[#F0F4FA] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30"
                    >
                      Download
                    </button>


                    <button
                      type="button"
                      onClick={() => handleFavourite(resource.id)}
                      title={isFavourite ? "Unlike" : "Like"}
                      aria-label={
                        isFavourite ? "Unlike resource" : "Like resource"
                      }
                      aria-pressed={isFavourite}
                      className={`flex h-9 min-w-11 items-center justify-center gap-1 rounded-lg border px-2 transition focus:outline-none focus:ring-2 focus:ring-red-300 ${
                        isFavourite
                          ? "border-red-200 bg-red-50 text-red-500"
                          : "border-[#E7E5DF] bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isFavourite ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={isFavourite ? 0 : 1.8}
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
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}



