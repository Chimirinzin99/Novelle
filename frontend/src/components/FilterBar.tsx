"use client";

// A horizontal row of dropdown filters, shared by the Notes,
// Question Papers, Assignments and Videos pages.
// The PAGE owns the selected values (its useState); this component
// only displays them and reports changes back through the on...Change props.
// Part 12: theme colours; 44 px tall controls (easy to tap on a phone).

type FilterBarProps = {
  year: string;
  onYearChange: (value: string) => void;
  semester: string;
  onSemesterChange: (value: string) => void;
  onClear: () => void;
  // Optional: pages that filter by module pass these three.
  // The "?" means the prop may be left out.
  modules?: string[];
  module?: string;
  onModuleChange?: (value: string) => void;
};

const YEARS = ["All Years", "Year 1", "Year 2", "Year 3", "Year 4"];
const SEMESTERS = ["All Semesters", "Semester 1", "Semester 2"];

// Same look for every dropdown, defined once.
const selectClass =
  "h-11 rounded-[10px] border-[1.5px] border-sky-line bg-white px-3 text-[15px] text-ink outline-none transition focus:border-navy-soft focus:ring-4 focus:ring-sky-tint";

export default function FilterBar({
  year,
  onYearChange,
  semester,
  onSemesterChange,
  onClear,
  modules,
  module,
  onModuleChange,
}: FilterBarProps) {
  // Only show "Clear filters" when something is actually filtered.
  const isFiltered =
    year !== "All Years" ||
    semester !== "All Semesters" ||
    (module !== undefined && module !== "All Modules");

  return (
    // flex-wrap: on narrow screens the dropdowns drop to a second line
    // instead of squashing together.
    <div className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
      <span className="font-display text-sm font-bold text-navy">Filter</span>

      <select
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        className={selectClass}
        aria-label="Year"
      >
        {YEARS.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>

      <select
        value={semester}
        onChange={(e) => onSemesterChange(e.target.value)}
        className={selectClass}
        aria-label="Semester"
      >
        {SEMESTERS.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      {/* Module dropdown appears only if the page gave us a module list */}
      {modules && onModuleChange && (
        <select
          value={module}
          onChange={(e) => onModuleChange(e.target.value)}
          className={`${selectClass} max-w-full`}
          aria-label="Module"
        >
          <option>All Modules</option>
          {modules.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      )}

      {isFiltered && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded text-[15px] font-semibold text-navy-soft outline-none hover:text-navy hover:underline focus-visible:ring-2 focus-visible:ring-navy/40"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}