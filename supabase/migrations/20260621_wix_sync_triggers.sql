-- ── Wix sync triggers ────────────────────────────────────────────────────
--
-- Calls the sync-arena-to-wix Edge Function via pg_net when:
--   1. A new row is inserted into arenaer
--   2. abonnementer.status changes for an existing arena
--
-- Prerequisites:
--   • pg_net extension enabled (Supabase dashboard → Database → Extensions → pg_net)
--   • Edge Function deployed: supabase functions deploy sync-arena-to-wix
--   • Replace <PROJECT_REF> with your Supabase project reference (e.g. "ebzcjomtkfqhbsrngnqb")
--   • Replace <ANON_KEY> with your Supabase anon key
--
-- Run this in: Supabase dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────

-- Enable pg_net if not already enabled
create extension if not exists pg_net;

-- ── Shared config ─────────────────────────────────────────────────────────
-- Store function URL and key so both triggers share the same values.
-- Update these two lines with your actual values before running.

do $$ begin
  perform set_config('app.wix_function_url',
    'https://<PROJECT_REF>.supabase.co/functions/v1/sync-arena-to-wix',
    false
  );
  perform set_config('app.supabase_anon_key',
    '<ANON_KEY>',
    false
  );
end $$;


-- ── Trigger 1: arenaer INSERT ─────────────────────────────────────────────

create or replace function notify_wix_on_arena_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := current_setting('app.wix_function_url'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body    := jsonb_build_object(
      'table',  'arenaer',
      'type',   'INSERT',
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

drop trigger if exists wix_sync_on_arena_insert on arenaer;
create trigger wix_sync_on_arena_insert
  after insert on arenaer
  for each row
  execute function notify_wix_on_arena_insert();


-- ── Trigger 2: abonnementer status UPDATE ────────────────────────────────

create or replace function notify_wix_on_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only fire when status actually changes
  if NEW.status is not distinct from OLD.status then
    return NEW;
  end if;

  perform net.http_post(
    url     := current_setting('app.wix_function_url'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body    := jsonb_build_object(
      'table',  'abonnementer',
      'type',   'UPDATE',
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

drop trigger if exists wix_sync_on_status_change on abonnementer;
create trigger wix_sync_on_status_change
  after update of status on abonnementer
  for each row
  execute function notify_wix_on_status_change();
