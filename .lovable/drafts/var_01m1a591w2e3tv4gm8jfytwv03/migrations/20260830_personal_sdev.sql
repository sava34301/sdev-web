-- Personal SDEV: usernames, dialects, extensions, libraries, core requests,
-- generated documentation. Additive only.

-- ---------------------------------------------------------------- usernames
create table if not exists public.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$'),
  created_at timestamptz not null default now()
);
grant select on public.usernames to anon, authenticated;
grant insert, update, delete on public.usernames to authenticated;
grant all on public.usernames to service_role;
alter table public.usernames enable row level security;
create policy "usernames are public" on public.usernames for select using (true);
create policy "own username insert" on public.usernames for insert to authenticated with check (auth.uid() = user_id);
create policy "own username update" on public.usernames for update to authenticated using (auth.uid() = user_id);
create policy "own username delete" on public.usernames for delete to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------- dialects
create table if not exists public.dialects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$'),
  name text not null,
  description text,
  languages text[] not null default '{en}',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  share_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  extends_slug text,
  latest_version text not null default '1.0.0',
  spec jsonb not null,
  install_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
grant select on public.dialects to anon, authenticated;
grant insert, update, delete on public.dialects to authenticated;
grant all on public.dialects to service_role;
alter table public.dialects enable row level security;
create policy "read own or shared dialects" on public.dialects for select
  using (visibility in ('public','unlisted') or auth.uid() = user_id);
create policy "insert own dialects" on public.dialects for insert to authenticated with check (auth.uid() = user_id);
create policy "update own dialects" on public.dialects for update to authenticated using (auth.uid() = user_id);
create policy "delete own dialects" on public.dialects for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.dialect_versions (
  id uuid primary key default gen_random_uuid(),
  dialect_id uuid not null references public.dialects(id) on delete cascade,
  version text not null,
  spec jsonb not null,
  created_at timestamptz not null default now(),
  unique (dialect_id, version)
);
grant select on public.dialect_versions to anon, authenticated;
grant insert, delete on public.dialect_versions to authenticated;
grant all on public.dialect_versions to service_role;
alter table public.dialect_versions enable row level security;
create policy "read versions of visible dialects" on public.dialect_versions for select
  using (exists (select 1 from public.dialects d where d.id = dialect_id
                 and (d.visibility in ('public','unlisted') or d.user_id = auth.uid())));
create policy "write versions of own dialects" on public.dialect_versions for insert to authenticated
  with check (exists (select 1 from public.dialects d where d.id = dialect_id and d.user_id = auth.uid()));
create policy "delete versions of own dialects" on public.dialect_versions for delete to authenticated
  using (exists (select 1 from public.dialects d where d.id = dialect_id and d.user_id = auth.uid()));

-- --------------------------------------------------------------- extensions
create table if not exists public.sdev_extensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'function' check (kind in ('function','operator')),
  symbol text,
  precedence integer,
  about text,
  source text not null,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
grant select on public.sdev_extensions to anon, authenticated;
grant insert, update, delete on public.sdev_extensions to authenticated;
grant all on public.sdev_extensions to service_role;
alter table public.sdev_extensions enable row level security;
create policy "read own or shared extensions" on public.sdev_extensions for select
  using (visibility in ('public','unlisted') or auth.uid() = user_id);
create policy "insert own extensions" on public.sdev_extensions for insert to authenticated with check (auth.uid() = user_id);
create policy "update own extensions" on public.sdev_extensions for update to authenticated using (auth.uid() = user_id);
create policy "delete own extensions" on public.sdev_extensions for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.core_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extension_id uuid references public.sdev_extensions(id) on delete set null,
  title text not null,
  rationale text,
  source text not null,
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','declined')),
  created_at timestamptz not null default now()
);
grant select, insert on public.core_requests to authenticated;
grant all on public.core_requests to service_role;
alter table public.core_requests enable row level security;
create policy "read own requests" on public.core_requests for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "file own requests" on public.core_requests for insert to authenticated with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- libraries
create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$'),
  name text not null,
  description text,
  visibility text not null default 'public' check (visibility in ('private','unlisted','public')),
  latest_version text not null default '1.0.0',
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
grant select on public.libraries to anon, authenticated;
grant insert, update, delete on public.libraries to authenticated;
grant all on public.libraries to service_role;
alter table public.libraries enable row level security;
create policy "read own or shared libraries" on public.libraries for select
  using (visibility in ('public','unlisted') or auth.uid() = user_id);
create policy "insert own libraries" on public.libraries for insert to authenticated with check (auth.uid() = user_id);
create policy "update own libraries" on public.libraries for update to authenticated using (auth.uid() = user_id);
create policy "delete own libraries" on public.libraries for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.library_versions (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries(id) on delete cascade,
  version text not null,
  manifest jsonb not null default '{}'::jsonb,
  -- { "path.sdev": "source", ... }
  modules jsonb not null,
  created_at timestamptz not null default now(),
  unique (library_id, version)
);
grant select on public.library_versions to anon, authenticated;
grant insert, delete on public.library_versions to authenticated;
grant all on public.library_versions to service_role;
alter table public.library_versions enable row level security;
create policy "read versions of visible libraries" on public.library_versions for select
  using (exists (select 1 from public.libraries l where l.id = library_id
                 and (l.visibility in ('public','unlisted') or l.user_id = auth.uid())));
create policy "write versions of own libraries" on public.library_versions for insert to authenticated
  with check (exists (select 1 from public.libraries l where l.id = library_id and l.user_id = auth.uid()));
create policy "delete versions of own libraries" on public.library_versions for delete to authenticated
  using (exists (select 1 from public.libraries l where l.id = library_id and l.user_id = auth.uid()));

-- ------------------------------------------------------- generated doc cache
create table if not exists public.dialect_docs (
  id uuid primary key default gen_random_uuid(),
  dialect_id uuid not null references public.dialects(id) on delete cascade,
  dialect_version text not null,
  template_version text not null,
  content text not null,
  stale boolean not null default false,
  created_at timestamptz not null default now(),
  unique (dialect_id, dialect_version, template_version)
);
grant select on public.dialect_docs to anon, authenticated;
grant insert, update, delete on public.dialect_docs to authenticated;
grant all on public.dialect_docs to service_role;
alter table public.dialect_docs enable row level security;
create policy "read docs of visible dialects" on public.dialect_docs for select
  using (exists (select 1 from public.dialects d where d.id = dialect_id
                 and (d.visibility in ('public','unlisted') or d.user_id = auth.uid())));
create policy "write docs of own dialects" on public.dialect_docs for insert to authenticated
  with check (exists (select 1 from public.dialects d where d.id = dialect_id and d.user_id = auth.uid()));
create policy "update docs of own dialects" on public.dialect_docs for update to authenticated
  using (exists (select 1 from public.dialects d where d.id = dialect_id and d.user_id = auth.uid()));
create policy "delete docs of own dialects" on public.dialect_docs for delete to authenticated
  using (exists (select 1 from public.dialects d where d.id = dialect_id and d.user_id = auth.uid()));

-- file signature mirror on cloud files (additive columns)
alter table public.code_files add column if not exists dialect_slug text;
alter table public.code_files add column if not exists dialect_version text;
alter table public.code_files add column if not exists runtime text;
alter table public.code_files add column if not exists lib_pins text[];
