"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; email: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, email };

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter an email and a password.", email };
  if (password.length < 6) return { error: "Use a password of at least 6 characters.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message, email };

  // Local Supabase signs the user in straight away (email confirmation is
  // off in supabase/config.toml). A hosted project with confirmations on
  // returns no session until the user clicks the link in the email.
  if (!data.session) {
    return { error: "Check your email to confirm your account, then sign in.", email };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
