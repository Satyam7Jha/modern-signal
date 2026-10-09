import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Task List" };

export default function LoginPage() {
  return (
    <main className="mx-auto mt-16 w-full max-w-sm px-4">
      <h1 className="text-2xl font-semibold">Task List</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in, or create an account to get started.</p>
      <LoginForm />
    </main>
  );
}
