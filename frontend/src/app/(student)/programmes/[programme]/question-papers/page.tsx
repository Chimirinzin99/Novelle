// Question Papers page: all the work is done by the shared ResourceList
// component. This file only says WHICH type to show and the words to use.
// (The old hard-coded sample papers are gone — the list now comes from
// the resources table, type = 'question_paper'.)
import ResourceList from "@/components/ResourceList";

export default function QuestionPapersPage() {
  return (
    <ResourceList
      type="question_paper"
      heading="Question Papers"
      description="Browse past examination papers for your modules."
      singular="question paper"
      plural="question papers"
    />
  );
}