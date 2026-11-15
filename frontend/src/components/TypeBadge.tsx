import { resourceTypeBadge, resourceTypeLabel } from "@/lib/resourceTypes";

// A small pill showing a resource's type ("Note", "Question Paper", …) in that
// type's fixed colour. Colours and labels live in lib/resourceTypes.ts.
// Usage: <TypeBadge type={resource.type} />
export default function TypeBadge({ type }: { type: string | null }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${resourceTypeBadge(
        type
      )}`}
    >
      {resourceTypeLabel(type)}
    </span>
  );
}