-- import_tasks used to return one row per inserted task. The Supabase API
-- (PostgREST) caps any list it returns at max_rows (1,000 in config.toml), so
-- an import of 4,000 new rows inserted all 4,000 but reported only 1,000, and
-- the route marked the other 3,000 as duplicates.
--
-- It now returns a single integer[] value. A scalar is never capped.
-- The body is unchanged apart from collecting the row numbers into an array.
-- The return type changes, so the function is dropped and recreated.

drop function public.import_tasks(jsonb);

-- A row is skipped if an active task with the same title (case-insensitive)
-- and due date already exists in the account. The function returns the
-- row numbers it inserted, sorted; any row sent but not returned was a
-- duplicate.
create function public.import_tasks(rows jsonb)
returns integer[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  imported integer[];
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  -- One import at a time per user, so two concurrent uploads of the same
  -- file cannot both pass the duplicate check.
  perform pg_advisory_xact_lock(hashtextextended((select auth.uid())::text, 0));

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
  select coalesce(array_agg(f.row_number order by f.row_number), '{}')
  into imported
  from fresh f;

  return imported;
end;
$$;

revoke execute on function public.import_tasks(jsonb) from public, anon;
grant execute on function public.import_tasks(jsonb) to authenticated;
