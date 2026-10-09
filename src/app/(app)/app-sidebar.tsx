"use client";

import { PlusIcon, SearchIcon, UploadIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type { TaskSummary } from "@/lib/task-summary";
import { cn } from "@/lib/utils";
import { VIEWS, viewHref } from "@/lib/views";
import { OPEN_COMMAND_MENU, VIEW_ICONS } from "./command-menu";
import { UserMenu } from "./user-menu";

export function AppSidebar({ email, summary }: { email: string; summary: TaskSummary | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = pathname === "/" ? searchParams.toString() : null;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background/70 backdrop-blur lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Task List home">
          <AppLogo />
        </Link>
      </div>

      <div className="space-y-2 px-3">
        <Button asChild className="w-full justify-start shadow-sm shadow-primary/25">
          <Link href="/tasks/new">
            <PlusIcon /> New task
            <Kbd className="ml-auto bg-white/15 text-primary-foreground">N</Kbd>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_MENU))}
        >
          <SearchIcon /> Search…
          <KbdGroup className="ml-auto">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3" aria-label="Main">
        <SidebarSection title="Views">
          {VIEWS.map((view) => (
            <SidebarLink
              key={view.id}
              href={viewHref(view.query)}
              icon={VIEW_ICONS[view.id]}
              active={currentQuery === view.query}
              count={summary?.[view.id]}
              alert={view.id === "overdue" && Boolean(summary?.overdue)}
            >
              {view.label}
            </SidebarLink>
          ))}
        </SidebarSection>

        <SidebarSection title="Data">
          <SidebarLink href="/import" icon={UploadIcon} active={pathname === "/import"}>
            Import CSV
          </SidebarLink>
        </SidebarSection>
      </nav>

      <div className="border-t p-3">
        <UserMenu email={email} variant="sidebar" />
      </div>
    </aside>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  count,
  alert = false,
  children,
}: {
  href: string;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className="size-4" />
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "ml-auto min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
            alert ? "bg-destructive/10 font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
