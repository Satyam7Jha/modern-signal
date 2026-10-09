"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { PriorityDot, PRIORITY_LABELS, STATUS_ICONS } from "@/components/task-badges";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { STATUSES, STATUS_LABELS } from "@/lib/task-fields";
import { DUE_FILTERS, type TaskFilters } from "@/lib/tasks";

const ALL = "all"; // Radix Select doesn't allow "" as an item value
const SEARCH_DELAY_MS = 300;

type FilterKey = "q" | "status" | "priority" | "due";

/**
 * Filters live in the URL (?q=&status=&priority=&due=). Changing one replaces
 * the URL, and the server page re-renders with the new results.
 */
export function TaskToolbar({ filters }: { filters: TaskFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Show the new filter values immediately, before the server responds.
  const current = { status: filters.status, priority: filters.priority ? String(filters.priority) : "", due: filters.due };
  const [optimistic, setOptimistic] = useOptimistic(current);
  const active = Boolean(filters.q || optimistic.status || optimistic.priority || optimistic.due);

  // When the filters are cleared elsewhere (e.g. the empty state's link), clear the box too.
  useEffect(() => {
    if (filters.q === "" && searchRef.current) searchRef.current.value = "";
  }, [filters.q]);

  function navigate(params: URLSearchParams, next?: Partial<typeof current>) {
    startTransition(() => {
      if (next) setOptimistic({ ...optimistic, ...next });
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function setFilter(key: FilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    navigate(params, key === "q" ? undefined : { [key]: value === ALL ? "" : value });
  }

  function onSearchChange(value: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilter("q", value.trim()), SEARCH_DELAY_MS);
  }

  function clearAll() {
    clearTimeout(searchTimer.current);
    if (searchRef.current) searchRef.current.value = "";
    navigate(new URLSearchParams(), { status: "", priority: "", due: "" });
  }

  return (
    <div role="search" className="flex flex-col gap-2 rounded-xl border bg-background p-2 shadow-xs sm:flex-row sm:items-center">
      <InputGroup className="sm:flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          type="search"
          aria-label="Search title or notes"
          placeholder="Search title or notes…"
          defaultValue={filters.q}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              clearTimeout(searchTimer.current);
              setFilter("q", event.currentTarget.value.trim());
            }
          }}
        />
        {pending && (
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        )}
      </InputGroup>

      <div className="grid grid-cols-3 gap-2 sm:flex">
        <Select value={optimistic.status || ALL} onValueChange={(value) => setFilter("status", value)}>
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-36">
            {/* Explicit labels so the trigger isn't blank before hydration. */}
            <SelectValue>{optimistic.status ? STATUS_LABELS[optimistic.status] : "All statuses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((status) => {
              const Icon = STATUS_ICONS[status];
              return (
                <SelectItem key={status} value={status}>
                  <Icon /> {STATUS_LABELS[status]}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={optimistic.priority || ALL} onValueChange={(value) => setFilter("priority", value)}>
          <SelectTrigger aria-label="Filter by priority" className="w-full sm:w-36">
            <SelectValue>{optimistic.priority ? `P${optimistic.priority} · ${PRIORITY_LABELS[Number(optimistic.priority)]}` : "All priorities"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {[1, 2, 3, 4, 5].map((priority) => (
              <SelectItem key={priority} value={String(priority)}>
                <PriorityDot priority={priority} /> P{priority} · {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={optimistic.due || ALL} onValueChange={(value) => setFilter("due", value)}>
          <SelectTrigger aria-label="Filter by due date" className="w-full sm:w-44">
            <SelectValue>{optimistic.due ? DUE_FILTERS[optimistic.due] : "Any due date"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any due date</SelectItem>
            {Object.entries(DUE_FILTERS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {active && (
        <Button variant="ghost" onClick={clearAll} className="text-muted-foreground">
          <XIcon /> Reset
        </Button>
      )}
    </div>
  );
}
