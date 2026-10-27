
"use client";

import ResourceList from "@/components/ResourceList";

export default function NotesPage() {
  return (
    <main className="min-h-full bg-[#FCFBF8] dark:bg-[#0E141D] px-5 py-7 text-[#24344D] dark:text-[#E5EAF1] md:px-10 md:py-9 lg:px-12">
     

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
