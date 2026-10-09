"use client";

import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CalendarRangeIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ListTodoIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { VIEWS, viewHref, type ViewId } from "@/lib/views";

/** Other components open the menu with: window.dispatchEvent(new Event(OPEN_COMMAND_MENU)) */
export const OPEN_COMMAND_MENU = "command-menu:open";
/** id of the task list's search box, focused by the "/" shortcut */
export const TASK_SEARCH_ID = "task-search";

export const VIEW_ICONS: Record<ViewId, LucideIcon> = {
  all: ListTodoIcon,
  today: CalendarCheckIcon,
  week: CalendarRangeIcon,
  overdue: AlarmClockIcon,
  in_progress: CircleDashedIcon,
  done: CircleCheckIcon,
};

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * ⌘K / Ctrl+K command palette, plus two single-key shortcuts that only fire
 * when you're not typing: N for a new task and / to search the list.
 */
export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

      if (event.key === "n") {
        event.preventDefault();
        router.push("/tasks/new");
      } else if (event.key === "/") {
        const search = document.getElementById(TASK_SEARCH_ID);
        if (search) {
          event.preventDefault();
          search.focus();
        }
      }
    }
    const openMenu = () => setOpen(true);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_MENU, openMenu);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_MENU, openMenu);
    };
  }, [router]);

  function run(action: () => void) {
    setOpen(false);
    setQuery("");
    action();
  }

  const search = query.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      description="Search tasks, jump to a view or run an action"
    >
      <CommandInput placeholder="Search tasks or type a command…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>

        {search && (
          <CommandGroup heading="Search">
            {/* The value includes the query, so cmdk always keeps this item visible. */}
            <CommandItem
              value={`search tasks ${search}`}
              onSelect={() => run(() => router.push(`/?q=${encodeURIComponent(search)}`))}
            >
              <SearchIcon /> Search tasks for “{search}”
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => router.push("/tasks/new"))}>
            <PlusIcon /> New task
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/import"))}>
            <UploadIcon /> Import tasks from CSV
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Views">
          {VIEWS.map((view) => {
            const Icon = VIEW_ICONS[view.id];
            return (
              <CommandItem key={view.id} onSelect={() => run(() => router.push(viewHref(view.query)))}>
                <Icon /> {view.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <SunIcon /> Light theme
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <MoonIcon /> Dark theme
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <MonitorIcon /> System theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
