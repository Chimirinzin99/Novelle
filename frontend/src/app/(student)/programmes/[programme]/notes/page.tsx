
"use client";

import { useRouter } from "next/navigation";
import ResourceList from "@/components/ResourceList";

export default function NotesPage() {
  const router = useRouter();

  return (
    <main className="min-h-full bg-[#FCFBF8] px-5 py-7 text-[#24344D] md:px-10 md:py-9 lg:px-12">
     

      <ResourceList
        type="note"
        heading="Notes"
        description="Browse approved study notes for your modules."
        singular="note"
        plural="notes"
      />
    </main>
  );
}
