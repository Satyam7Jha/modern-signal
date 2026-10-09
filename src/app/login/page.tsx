import { FileSpreadsheetIcon, LockKeyholeIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { AppLogo } from "@/components/app-logo";
import { TaskBoardScene } from "@/components/task-board-scene";
import { LoginForm } from "./login-form";
import { TaskPreviewCard } from "./task-preview-card";

export const metadata: Metadata = { title: "Sign in · Task List" };

const FEATURES = [
  { icon: ShieldCheckIcon, label: "Private by design" },
  { icon: FileSpreadsheetIcon, label: "Bulk CSV import" },
  { icon: SearchIcon, label: "Instant search" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Showcase panel (large screens): live 3D board, headline and a product preview */}
      <section className="relative isolate hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex">
        <TaskBoardScene className="absolute inset-0 -z-10" />
        {/* Aurora + fade so the text stays readable over the scene */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_20%_10%,rgb(99_102_241/0.25),transparent),radial-gradient(50%_40%_at_90%_80%,rgb(139_92_246/0.18),transparent)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />

        <AppLogo className="text-lg" />

        <div className="space-y-10">
          <div className="max-w-lg space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 ring-1 ring-white/10 backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Your tasks, organised
            </p>
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
              Plan less.{" "}
              <span className="bg-linear-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Finish more.
              </span>
            </h1>
            <p className="max-w-md text-lg text-zinc-400">
              Due dates, priorities, smart views and painless CSV import, in one fast, focused list.
            </p>
          </div>

          <TaskPreviewCard />
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="size-4 text-indigo-300" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* Sign-in panel, on a faint dot grid */}
      <section className="relative flex flex-col items-center justify-center bg-background px-6 py-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] mask-[radial-gradient(60%_60%_at_50%_50%,black,transparent)] bg-size-[22px_22px]"
        />
        <div className="relative flex w-full max-w-sm flex-col items-center">
          <AppLogo className="mb-10 text-lg lg:hidden" />
          <LoginForm />
          <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyholeIcon className="size-3.5" />
            Secured by Supabase Auth and Postgres row-level security
          </p>
        </div>
      </section>
    </main>
  );
}
