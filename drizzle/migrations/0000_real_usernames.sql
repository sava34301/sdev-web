-- Real handles for every account, never derived from the email address.

create or replace function public.handle_base(_seed text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare base text;
begin
  base := lower(coalesce(_seed, ''));
  base := regexp_replace(base, '@.*$', '');          -- never keep an email domain
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  base := substring(base from 1 for 24);
  if base is null or length(base) < 2 then
    base := 'dev';
  end if;
  return base;
end;
$$;

create or replace function public.claim_username(_user_id uuid, _seed text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare base text; candidate text; n int := 0;
begin
  select username into candidate from public.usernames where user_id = _user_id;
  if candidate is not null then
    return candidate;
  end if;

  base := public.handle_base(_seed);
  candidate := base;
  while exists (select 1 from public.usernames where username = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
    if n > 50 then
      candidate := base || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 5);
    end if;
  end loop;

  insert into public.usernames (user_id, username) values (_user_id, candidate)
  on conflict (user_id) do nothing;
  return candidate;
end;
$$;

grant execute on function public.claim_username(uuid, text) to authenticated, service_role;

-- New accounts: pick the handle the person typed, else their display name,
-- never the email address.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare seed text; handle text;
begin
  seed := nullif(trim(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    ''
  )), '');

  if seed is null then
    seed := 'dev-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
  end if;

  handle := public.claim_username(new.id, seed);

  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      handle
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Backfill: everyone without a handle gets one, seeded from their display name
-- when it is a real name, otherwise a generated handle.
do $$
declare r record; seed text;
begin
  for r in
    select u.id,
           nullif(trim(coalesce(u.raw_user_meta_data->>'username', '')), '') as meta_handle,
           p.display_name,
           u.email
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where not exists (select 1 from public.usernames un where un.user_id = u.id)
  loop
    seed := coalesce(
      r.meta_handle,
      case
        when r.display_name is not null
         and trim(r.display_name) <> ''
         and lower(trim(r.display_name)) <> lower(split_part(coalesce(r.email, ''), '@', 1))
        then r.display_name
      end,
      'dev-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6)
    );
    perform public.claim_username(r.id, seed);
  end loop;
end;
$$;

-- Profiles still showing the raw email (or its local part) get their handle instead.
update public.profiles p
set display_name = un.username
from public.usernames un, auth.users u
where un.user_id = p.user_id
  and u.id = p.user_id
  and (
    p.display_name is null
    or trim(p.display_name) = ''
    or lower(trim(p.display_name)) = lower(coalesce(u.email, '@'))
    or lower(trim(p.display_name)) = lower(split_part(coalesce(u.email, '@'), '@', 1))
  );