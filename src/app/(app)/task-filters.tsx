import Link from "next/link";
import { STATUSES, STATUS_LABELS } from "@/lib/task-fields";
import { DUE_FILTERS, hasActiveFilters, type TaskFilters as Filters } from "@/lib/tasks";

/**
 * A plain GET form: submitting it puts the filters in the URL, and the page
 * (a Server Component) reads them from searchParams. No client state needed.
 */
export function TaskFilters({ filters }: { filters: Filters }) {
  return (
    <form method="get" className="card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
      <label className="block">
        <span className="sr-only">Search</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search title or notes"
          className="input"
        />
      </label>
      <label className="block">
        <span className="sr-only">Status</span>
        <select name="status" defaultValue={filters.status} className="input">
          <option value="">Any status</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Priority</span>
        <select name="priority" defaultValue={filters.priority ?? ""} className="input">
          <option value="">Any priority</option>
          {[1, 2, 3, 4, 5].map((priority) => (
            <option key={priority} value={priority}>
              Priority {priority}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Due date</span>
        <select name="due" defaultValue={filters.due} className="input">
          <option value="">Any due date</option>
          {Object.entries(DUE_FILTERS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          Filter
        </button>
        {hasActiveFilters(filters) && (
          <Link href="/" className="btn">
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
