import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
} as const;

type Props = {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  active?: boolean;
  hint?: string;
  /** 0 to 1; renders a progress bar under the value. */
  progress?: number;
};

/** A clickable summary tile; clicking it applies the matching view. */
export function StatCard({ href, label, value, icon: Icon, tone, active, hint, progress }: Props) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group rounded-xl border bg-background p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(progress * 100)}%</span>
        </div>
      ) : (
        hint && <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
      )}
    </Link>
  );
}
