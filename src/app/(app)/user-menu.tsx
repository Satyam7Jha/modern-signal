"use client";

import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "../login/actions";

/** Account menu: theme switcher and sign out. "sidebar" shows the email next to the avatar. */
export function UserMenu({ email, variant = "compact" }: { email: string; variant?: "sidebar" | "compact" }) {
  const { theme, setTheme } = useTheme();
  const [signingOut, startSignOut] = useTransition();

  const avatar = (
    <Avatar className="size-8">
      <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-medium text-white uppercase">
        {email.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <Button variant="ghost" className="h-auto w-full justify-start gap-2.5 px-2 py-1.5" aria-label="Account menu">
            {avatar}
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-xs text-muted-foreground">Signed in as</span>
              <span className="w-full truncate text-sm font-medium">{email}</span>
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
            {avatar}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} side={variant === "sidebar" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <SunIcon /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <MoonIcon /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <MonitorIcon /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOut())}>
          <LogOutIcon /> {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
