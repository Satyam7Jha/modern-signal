import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Helpers for tests that run against the local Supabase stack (`npm run db:start`).
// They use only the publishable key, exactly like the app: each test user signs
// up through Supabase Auth and every query goes through row-level security.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function anonClient(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. Copy .env.example to .env.local (see README).",
    );
  }
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertSupabaseIsRunning() {
  anonClient(); // throws a clear error if the env vars are missing
  try {
    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishableKey! } });
    if (response.ok) return;
  } catch {
    // fall through to the error below
  }
  throw new Error(`Local Supabase is not reachable at ${url}. Start it with \`npm run db:start\`.`);
}

export type TestUser = { client: SupabaseClient; userId: string; email: string };

/** Signs up a brand-new user (email confirmation is off locally) and returns a client signed in as them. */
export async function createTestUser(label: string): Promise<TestUser> {
  const client = anonClient();
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const { data, error } = await client.auth.signUp({ email, password: "test-password-123" });
  if (error || !data.session || !data.user) {
    throw new Error(`Could not sign up ${email}: ${error?.message ?? "no session returned"}`);
  }
  return { client, userId: data.user.id, email };
}
