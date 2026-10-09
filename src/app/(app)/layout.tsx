import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { getUser } from "@/lib/supabase/server";
import { AppSidebar } from "./app-sidebar";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const email = user.email ?? "";

  return (
    <div className="flex min-h-svh flex-1 bg-muted/40">
      <AppSidebar email={email} />

      <div className="flex min-w-0 flex-1 flex-col">
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

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
