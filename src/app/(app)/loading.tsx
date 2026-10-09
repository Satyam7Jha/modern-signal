import { Skeleton } from "@/components/ui/skeleton";

// Shown while a page in this segment loads (Next.js wraps the page in <Suspense>).
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading…
      </span>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="divide-y rounded-xl border bg-background">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-4 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-5 w-24 rounded-full md:block" />
            <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
