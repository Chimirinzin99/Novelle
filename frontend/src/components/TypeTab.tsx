import { resourceTypeLabel, resourceTypeTab } from "@/lib/resourceTypes";

// Part 21: the coloured "folder tab" that sits on top of every resource card
// and says what the resource is (Note, Question Paper, Assignment, Video).
// Same colours as TypeBadge (lib/resourceTypes.ts), only the shape differs:
// rounded on top, flat at the bottom, so it looks attached to the card.
// It starts at the card's left edge (like a folder tab); the card's
// top-left corner is square so the two join up.
// Usage (above the card's <article>): <TypeTab type={resource.type} />
export default function TypeTab({ type }: { type: string | null }) {
  return (
    <div className="flex">
      <span
        className={`rounded-t-lg px-3.5 pb-[5px] pt-1.5 text-xs font-bold ${resourceTypeTab(type)}`}
      >
        {resourceTypeLabel(type)}
      </span>
    </div>
  );
}
