// Creates a demo account with a small, realistic set of tasks for trying the
// app or recording a demo. Run it after `npm run db:reset` (which wipes all
// data): `npm run db:seed`.
//
// It goes through Supabase Auth and the API with the publishable key, exactly
// like the app, so the tasks are created by the demo user under RLS.
// Due dates are relative to today, so the dashboard always has something due
// today, something overdue and something coming up.

import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password";

process.loadEnvFile(".env.local");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Today's date as YYYY-MM-DD, offset by a number of days (same as isoDate in src/lib/tasks.ts). */
function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const TASKS = [
  { title: "Renew car insurance", due: -3, priority: 1, status: "todo", notes: "Compare the two quotes from last week first." },
  { title: "Send invoice for September", due: -1, priority: 2, status: "in_progress", notes: null },
  { title: "Prepare slides for Monday review", due: 0, priority: 1, status: "in_progress", notes: "Include sales, support and churn numbers." },
  { title: "Call the dentist", due: 0, priority: 3, status: "todo", notes: null },
  { title: "Book flights for the offsite", due: 1, priority: 2, status: "todo", notes: "Window seat, morning departure." },
  { title: "Review pull request #42", due: 2, priority: 2, status: "todo", notes: null },
  { title: "Buy a birthday present for Sam", due: 4, priority: 3, status: "todo", notes: null },
  { title: "Water the plants", due: 6, priority: 5, status: "todo", notes: null },
  { title: "Plan the quarterly budget", due: 14, priority: 2, status: "todo", notes: "Draft in the shared sheet; numbers due from finance." },
  { title: "Clean out the garage", due: 30, priority: 4, status: "todo", notes: null },
  { title: "Pay the electricity bill", due: -2, priority: 1, status: "done", notes: null },
  { title: "Update the team wiki", due: -5, priority: 4, status: "done", notes: null },
];

async function signInOrSignUp() {
  const signIn = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (!signIn.error) return;
  const signUp = await supabase.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (signUp.error || !signUp.data.session) {
    throw new Error(`Could not sign in or sign up ${DEMO_EMAIL}: ${signUp.error?.message ?? "no session"}`);
  }
}

await signInOrSignUp();

const { count, error: countError } = await supabase.from("tasks").select("id", { count: "exact", head: true });
if (countError) throw countError;
if (count > 0) {
  console.log(`${DEMO_EMAIL} already has ${count} tasks; nothing added. Run \`npm run db:reset\` first for a clean slate.`);
  process.exit(0);
}

const { error } = await supabase.from("tasks").insert(
  TASKS.map(({ due, ...task }) => ({ ...task, due_date: isoDate(due) })),
);
if (error) throw error;

console.log(`Seeded ${TASKS.length} tasks. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
