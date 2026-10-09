import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">
            Task List
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Tasks
            </Link>
            <Link href="/import" className="text-slate-600 hover:text-slate-900">
              Import CSV
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-slate-600 hover:text-slate-900 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
