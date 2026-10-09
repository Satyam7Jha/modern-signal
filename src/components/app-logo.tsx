import { ListChecksIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ListChecksIcon className="size-4" />
      </span>
      Task List
    </span>
  );
}
