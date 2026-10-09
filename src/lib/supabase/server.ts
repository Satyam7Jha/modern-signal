import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * It uses the publishable key plus the signed-in user's session cookie, so
 * every query runs as that user and Postgres row-level security decides what
 * they can see. The app never uses a service-role/secret key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. That's fine: proxy.ts
            // refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}

/** Returns the signed-in user, verified with Supabase Auth, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
