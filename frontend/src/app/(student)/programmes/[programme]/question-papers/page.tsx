
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
