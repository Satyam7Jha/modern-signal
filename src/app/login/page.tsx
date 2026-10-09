import type { Metadata } from "next";
import { AppLogo } from "@/components/app-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Task List" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <AppLogo className="mb-6 text-lg" />
      <LoginForm />
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        Your tasks are private: each account can only ever see its own tasks.
      </p>
    </main>
  );
}
