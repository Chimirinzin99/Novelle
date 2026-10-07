"use client";

// A horizontal row of dropdown filters, shared by the Notes,
// Question Papers and Assignments pages.
// The PAGE owns the selected values (its useState); this component
// only displays them and reports changes back through the on...Change props.

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
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none";

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
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <span className="text-sm font-semibold text-gray-900">Filter</span>

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
          className={selectClass}
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
          onClick={onClear}
          className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}