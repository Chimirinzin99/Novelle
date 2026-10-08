
import { supabase } from "@/lib/supabase";

export async function findProgramme(slug: string) {
  const decodedSlug = decodeURIComponent(slug).trim();

  // Convert URL slug to possible full programme name
  // Example:
  // civil-engineering -> Civil Engineering
  // software-engineering -> Software Engineering
  const possibleName = decodedSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  // 1. Try short_name first
  // Example:
  // ece -> ECE
  // se -> SE
  // it -> IT
  const { data: shortNameData, error: shortNameError } =
    await supabase
      .from("programmes")
      .select("id, name, short_name")
      .eq("short_name", decodedSlug.toUpperCase())
      .maybeSingle();

  if (shortNameData) {
    return {
      data: shortNameData,
      error: null,
    };
  }

  if (shortNameError) {
    console.error(
      "Short name programme lookup error:",
      shortNameError
    );
  }

  // 2. Try full programme name
  // Example:
  // civil-engineering -> Civil Engineering
  // electronics-and-communication-engineering
  // -> Electronics And Communication Engineering
  const { data: nameData, error: nameError } =
    await supabase
      .from("programmes")
      .select("id, name, short_name")
      .ilike("name", possibleName)
      .maybeSingle();

  if (nameData) {
    return {
      data: nameData,
      error: null,
    };
  }

  if (nameError) {
    console.error(
      "Full name programme lookup error:",
      nameError
    );
  }

  // 3. Final fallback:
  // Compare the slug against the database names manually.
  const { data: allProgrammes, error: allError } =
    await supabase
      .from("programmes")
      .select("id, name, short_name");

  if (allError) {
    console.error(
      "All programmes lookup error:",
      allError
    );

    return {
      data: null,
      error: allError,
    };
  }

  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalisedSlug = normalise(decodedSlug);

  const matchedProgramme = (allProgrammes || []).find(
    (programme) => {
      const normalisedName = normalise(programme.name);
      const normalisedShortName = normalise(
        programme.short_name
      );

      return (
        normalisedSlug === normalisedName ||
        normalisedSlug === normalisedShortName
      );
    }
  );

  if (matchedProgramme) {
    return {
      data: matchedProgramme,
      error: null,
    };
  }

  return {
    data: null,
    error: new Error(
      `Unable to find programme "${decodedSlug}".`
    ),
  };
}

