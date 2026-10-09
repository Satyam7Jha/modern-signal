import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { getUser } from "@/lib/supabase/server";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:gap-6">
          <Link href="/" aria-label="Task List home">
            <AppLogo />
          </Link>
          <MainNav />
          <div className="ml-auto">
            <UserMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
