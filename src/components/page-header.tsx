import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Title block for the secondary pages (new / edit task, import). */
export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/">
          <ArrowLeftIcon /> Back to tasks
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
