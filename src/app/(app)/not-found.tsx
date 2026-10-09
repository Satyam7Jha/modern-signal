import { ArrowLeftIcon, FileQuestionIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <Empty className="border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestionIcon />
        </EmptyMedia>
        <EmptyTitle>Task not found</EmptyTitle>
        <EmptyDescription>It may have been deleted, or it belongs to another account.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeftIcon /> Back to tasks
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
