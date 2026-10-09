"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="card border-red-200 px-6 py-10 text-center">
      <p className="font-medium text-red-700">Something went wrong.</p>
      <p className="mt-1 text-sm text-slate-600">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <button type="button" onClick={() => retry()} className="btn mt-4">
        Try again
      </button>
    </div>
  );
}
