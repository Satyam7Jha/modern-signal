import { ListChecksIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm ring-1 ring-white/20">
        <ListChecksIcon className="size-4.5" />
      </span>
      {!compact && "Task List"}
    </span>
  );
}
