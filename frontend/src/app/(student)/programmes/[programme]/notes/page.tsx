// Notes page: all the work is done by the shared ResourceList component.
// This file only says WHICH type to show and the words to use.
// (Part 12: the extra <main> wrapper and unused router were removed —
// ResourceList draws the whole page, like the other two category pages.)
import ResourceList from "@/components/ResourceList";

export default function NotesPage() {
  return (
    <ResourceList
      type="note"
      heading="Notes"
      description="Browse approved study notes for your modules."
      singular="note"
      plural="notes"
    />
  );
}