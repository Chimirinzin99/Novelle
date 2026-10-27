// Assignments page: all the work is done by the shared ResourceList
// component. This file only says WHICH type to show and the words to use.
// (The old hard-coded sample assignments are gone — the list now comes
// from the resources table, type = 'assignment'.)
import ResourceList from "@/components/ResourceList";

export default function AssignmentsPage() {
  return (
    <ResourceList
      type="assignment"
      heading="Assignments"
      description="Browse assignments and coursework for your modules."
      singular="assignment"
      plural="assignments"
    />
  );
}