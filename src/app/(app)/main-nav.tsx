"use client";

import { ListTodoIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Tasks", icon: ListTodoIcon },
  { href: "/import", label: "Import CSV", icon: UploadIcon },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/tasks") : pathname.startsWith(href);
        return (
          <Button
            key={href}
            asChild
            variant="ghost"
            size="sm"
            className={cn("text-muted-foreground", active && "bg-muted text-foreground")}
          >
            <Link href={href} aria-current={active ? "page" : undefined}>
              <Icon />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
