// Shown while a page in this segment loads (Next.js wraps it in <Suspense>).
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
      <div className="card h-16 animate-pulse bg-slate-100" />
      <div className="card divide-y divide-slate-200">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 px-4 py-4">
            <div className="h-5 w-8 animate-pulse rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
