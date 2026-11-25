-- Jalankan SEKALI di Supabase > SQL Editor
alter table grades add column if not exists metode text;
alter table memos add column if not exists color text;
create table if not exists payments(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, category text default 'UKT/SPP', amount numeric default 0, date date default current_date, semester int, file_path text, note text, created_at timestamptz default now());
alter table payments enable row level security;
drop policy if exists "own" on payments;
create policy "own" on payments for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create index if not exists payments_user on payments(user_id);
grant select,insert,update,delete on payments to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bukti','bukti',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict (id) do nothing;
drop policy if exists "bukti own" on storage.objects;
create policy "bukti own" on storage.objects for all to authenticated using (bucket_id='bukti' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='bukti' and (storage.foldername(name))[1]=auth.uid()::text);
