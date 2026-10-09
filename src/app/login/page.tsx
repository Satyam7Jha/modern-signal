import { FileSpreadsheetIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { AppLogo } from "@/components/app-logo";
import { TaskBoardScene } from "@/components/task-board-scene";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Task List" };

const FEATURES = [
  { icon: ShieldCheckIcon, title: "Private by design", text: "Row-level security in Postgres: only you can see your tasks." },
  { icon: FileSpreadsheetIcon, title: "Bulk import from CSV", text: "Every row is validated; bad rows come back with a reason." },
  { icon: SearchIcon, title: "Find anything", text: "Search, filter by status, priority or due date in a click." },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Showcase panel (large screens) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex">
        <TaskBoardScene className="absolute inset-0" />
        <div className="absolute inset-0 bg-linear-to-tr from-zinc-950 via-zinc-950/75 to-zinc-950/0" />

        <AppLogo className="relative text-lg" />

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-balance">Plan less. Finish more.</h1>
            <p className="text-zinc-400">
              A focused task list with due dates, priorities and painless CSV import.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="size-4 text-indigo-300" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-zinc-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-500">Built with Next.js, Supabase and shadcn/ui.</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col items-center justify-center bg-background px-6 py-12">
        <AppLogo className="mb-10 text-lg lg:hidden" />
        <LoginForm />
      </section>
    </main>
  );
}
