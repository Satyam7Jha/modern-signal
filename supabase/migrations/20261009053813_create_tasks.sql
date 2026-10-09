-- Tasks belong to exactly one user. Row-level security makes every row
-- visible and writable only by its owner; the app never bypasses it.

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  notes       text,
  due_date    date not null,
  priority    smallint not null default 3 check (priority between 1 and 5),
  status      text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Soft delete: a non-null value hides the task everywhere in the app.
  deleted_at  timestamptz,
  -- Lets the list search title and notes with a single ILIKE filter.
  search_text text generated always as (title || ' ' || coalesce(notes, '')) stored
);

-- Serves the task list (sorted by due date) and the import duplicate check.
create index tasks_user_due_date_idx on public.tasks (user_id, due_date) where deleted_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

-- Policies only check ownership. Hiding soft-deleted rows is done in queries:
-- if the SELECT policy filtered deleted_at, the UPDATE that sets deleted_at
-- would be rejected because the updated row would no longer be visible.
create policy "Users can read their own tasks"
on public.tasks for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own tasks"
on public.tasks for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own tasks"
on public.tasks for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- No DELETE policy and no DELETE grant: tasks can only be soft-deleted.
-- Signed-in users may only write the editable columns; user_id, id and the
-- timestamps are always set by the database.
revoke all on public.tasks from anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (title, notes, due_date, priority, status) on public.tasks to authenticated;
grant update (title, notes, due_date, priority, status, deleted_at) on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- CSV import
-- ---------------------------------------------------------------------------
-- The server validates the file and removes duplicates within it, then sends
-- the valid rows here. Everything below runs in a single transaction as the
-- calling user (security invoker), so RLS still applies.
--
-- A row is skipped if an active task with the same title (case-insensitive)
-- and due date already exists in the account. The function returns the
-- row numbers it inserted; any row sent but not returned was a duplicate.
create function public.import_tasks(rows jsonb)
returns table (imported_row integer)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  -- One import at a time per user, so two concurrent uploads of the same
  -- file cannot both pass the duplicate check.
  perform pg_advisory_xact_lock(hashtextextended((select auth.uid())::text, 0));

  return query
  with incoming as (
    select r.row_number, btrim(r.title) as title, r.notes, r.due_date, r.priority
    from jsonb_to_recordset(rows) as r(row_number integer, title text, notes text, due_date date, priority smallint)
  ),
  fresh as (
    select i.*
    from incoming i
    where not exists (
      select 1
      from public.tasks t
      where t.user_id = (select auth.uid())
        and t.deleted_at is null
        and t.due_date = i.due_date
        and lower(btrim(t.title)) = lower(i.title)
    )
  ),
  inserted as (
    insert into public.tasks (title, notes, due_date, priority)
    select f.title, f.notes, f.due_date, f.priority from fresh f
    returning 1
  )
  select f.row_number from fresh f order by f.row_number;
end;
$$;

revoke execute on function public.import_tasks(jsonb) from public, anon;
grant execute on function public.import_tasks(jsonb) to authenticated;
