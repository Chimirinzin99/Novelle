// lib/programmeBanners.ts — Part 21: a real CST photo for each programme's
// banner (/programmes/<slug>), instead of the same dzong picture for all.
// Photos: College of Science and Technology (cst.edu.bt and its department
// sites), compressed to WebP in public/images/programmes/<slug>.webp.
// position = which part of the photo stays visible in the wide, short banner
// (CSS object-position). A programme missing here falls back to the campus
// photo. "standIn" marks photos that are not from that programme's own field
// (replace them when the department has a better one).

type Banner = { src: string; position: string; standIn?: boolean };

const FALLBACK: Banner = { src: "/images/campus/aerial.webp", position: "center 60%" };

const BANNERS: Record<string, Banner> = {
  "software-engineering": { src: "/images/programmes/software-engineering.webp", position: "center 40%" },
  "information-technology": { src: "/images/programmes/information-technology.webp", position: "center 45%" },
  architecture: { src: "/images/programmes/architecture.webp", position: "center 50%" },
  "civil-engineering": { src: "/images/programmes/civil-engineering.webp", position: "center 30%" },
  "electrical-engineering": { src: "/images/programmes/electrical-engineering.webp", position: "center 45%" },
  "electronics-and-communication-engineering": {
    src: "/images/programmes/electronics-and-communication-engineering.webp",
    position: "center 30%",
  },
  "instrumentation-and-control-engineering": {
    src: "/images/programmes/instrumentation-and-control-engineering.webp",
    position: "center 40%",
  },
  "mechanical-engineering": { src: "/images/programmes/mechanical-engineering.webp", position: "center 35%", standIn: true },
  "engineering-geology": { src: "/images/programmes/engineering-geology.webp", position: "center 40%", standIn: true },
  // Water Resources: no photo yet, so it uses the campus photo (FALLBACK).
};

export function programmeBanner(slug: string): Banner {
  return BANNERS[slug] ?? FALLBACK;
}
