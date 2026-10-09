import { existsSync } from "node:fs";

// The database tests (tests/db) read the local Supabase URL and publishable key from
// .env.local, the same file `next dev` uses (see README).
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
