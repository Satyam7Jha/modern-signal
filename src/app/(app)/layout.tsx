import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { getUser } from "@/lib/supabase/server";
import { getTaskSummary } from "@/lib/task-summary";
import { AppSidebar } from "./app-sidebar";
import { CommandMenu } from "./command-menu";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const email = user.email ?? "";
  // Counts are a nice-to-have here; if they fail, the page's own error boundary reports it.
  const summary = await getTaskSummary().catch(() => null);

  return (
    // The app fills the viewport; <main> is the scroll area, and the task list
    // page uses the full height so only its table scrolls.
    <div className="relative flex h-svh overflow-hidden bg-muted/40">
      <AppSidebar email={email} summary={summary} />
      <CommandMenu />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Soft brand glow behind the page header */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_13%,transparent),transparent)]"
        />

        {/* Top bar for small screens, where the sidebar is hidden */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 lg:hidden">
          <Link href="/" aria-label="Task List home">
            <AppLogo compact />
          </Link>
          <MainNav />
          <div className="ml-auto">
            <UserMenu email={email} />
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
