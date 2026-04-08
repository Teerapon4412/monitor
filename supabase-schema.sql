create table if not exists public.machine_jobs (
  machine_id text primary key,
  area text not null default '',
  direct_value text not null default '',
  part_code text not null default '',
  part_name text not null default '',
  entity_type text not null default 'PART',
  qr_value text not null default '',
  updated_at timestamptz not null default now(),
  scanned_by text not null default ''
);

alter table public.machine_jobs enable row level security;

drop policy if exists "machine_jobs_select_all" on public.machine_jobs;
create policy "machine_jobs_select_all"
on public.machine_jobs
for select
to anon, authenticated
using (true);

drop policy if exists "machine_jobs_insert_all" on public.machine_jobs;
create policy "machine_jobs_insert_all"
on public.machine_jobs
for insert
to anon, authenticated
with check (true);

drop policy if exists "machine_jobs_update_all" on public.machine_jobs;
create policy "machine_jobs_update_all"
on public.machine_jobs
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "machine_jobs_delete_all" on public.machine_jobs;
create policy "machine_jobs_delete_all"
on public.machine_jobs
for delete
to anon, authenticated
using (true);
