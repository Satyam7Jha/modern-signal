"use client"; // Error boundaries must be Client Components

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty role="alert" className="border border-destructive/30 bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>We couldn&apos;t load this page. Check your connection and try again.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCwIcon /> Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
