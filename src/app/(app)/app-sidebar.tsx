"use client";

import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CalendarRangeIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ListTodoIcon,
  PlusIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VIEWS, viewHref, type ViewId } from "@/lib/views";
import { UserMenu } from "./user-menu";

const VIEW_ICONS: Record<ViewId, LucideIcon> = {
  all: ListTodoIcon,
  today: CalendarCheckIcon,
  week: CalendarRangeIcon,
  overdue: AlarmClockIcon,
  in_progress: CircleDashedIcon,
  done: CircleCheckIcon,
};

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = pathname === "/" ? searchParams.toString() : null;

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Task List home">
          <AppLogo />
        </Link>
      </div>

      <div className="px-3">
        <Button asChild className="w-full justify-start shadow-sm">
          <Link href="/tasks/new">
            <PlusIcon /> New task
          </Link>
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
    <div className="space-y-1">
      <p className="px-2.5 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon: LucideIcon;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
