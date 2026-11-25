-- Campus Tracker: tempel semua isi file ini di Supabase > SQL Editor > Run
create table courses(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, name text not null, code text, lecturer text, day text, start_time text, end_time text, room text, semester int default 1, sks int default 2, note text, created_at timestamptz default now());
create table tasks(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, course text, description text, deadline timestamptz, priority text default 'Sedang', status text default 'Belum', note text, created_at timestamptz default now());
create table deadlines(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, category text default 'Lainnya', due timestamptz not null, priority text default 'Sedang', status text default 'Belum', note text, created_at timestamptz default now());
create table grades(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, course_name text not null, code text, semester int default 1, sks int not null default 2, score numeric, letter text, created_at timestamptz default now());
create table attendance(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, course text not null, date date not null default current_date, status text default 'Hadir', note text, created_at timestamptz default now());
create table transactions(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, type text default 'Keluar', category text default 'Lainnya', amount numeric not null, date date default current_date, note text, created_at timestamptz default now());
create table memos(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, content text default '', updated_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['courses','tasks','deadlines','grades','attendance','transactions','memos'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy "own" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  execute format('create index on %I(user_id)', t);
 end loop;
end $$;
