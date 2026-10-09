import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  indigo: { chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", ring: "stroke-indigo-500" },
  amber: { chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400", ring: "stroke-amber-500" },
  red: { chip: "bg-red-500/10 text-red-600 dark:text-red-400", ring: "stroke-red-500" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "stroke-emerald-500" },
} as const;

type Props = {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  active?: boolean;
  /** 0 to 1; shows a progress ring instead of the icon. */
  progress?: number;
};

/** A compact, clickable summary tile; clicking it applies the matching view. */
export function StatCard({ href, label, value, icon: Icon, tone, active, progress }: Props) {
  const colors = TONES[tone];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-background/80 p-3 shadow-xs backdrop-blur transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "border-primary/40 ring-1 ring-primary/25",
      )}
    >
      {progress !== undefined ? (
        <ProgressRing value={progress} className={colors.ring} />
      ) : (
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", colors.chip)}>
          <Icon className="size-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

function ProgressRing({ value, className }: { value: number; className: string }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(value * 100);

  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center" role="img" aria-label={`${percent}% complete`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
          className={cn("transition-[stroke-dashoffset] duration-700", className)}
        />
      </svg>
      <span className="text-[10px] font-semibold tabular-nums">{percent}%</span>
    </span>
  );
}
