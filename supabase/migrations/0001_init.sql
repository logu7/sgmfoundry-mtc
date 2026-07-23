-- SGM Foundry MTC schema.
-- Ported from the previous Lovable-managed project, with RLS tightened so
-- only the creator (or an admin) can update/delete a certificate, rather
-- than any authenticated user.

create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Certificates
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text not null,
  invoice_no text,
  certificate_date date,
  heat_number text,
  customer_name text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.certificates enable row level security;

create policy "Authenticated view all certificates"
  on public.certificates for select to authenticated using (true);

create policy "Authenticated insert own certificates"
  on public.certificates for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Owner or admin update certificates"
  on public.certificates for update to authenticated
  using (auth.uid() = created_by or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = created_by or public.has_role(auth.uid(), 'admin'));

create policy "Owner or admin delete certificates"
  on public.certificates for delete to authenticated
  using (auth.uid() = created_by or public.has_role(auth.uid(), 'admin'));

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_certificates_updated_at
  before update on public.certificates
  for each row execute function public.update_updated_at_column();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create index certificates_created_at_idx on public.certificates (created_at desc);
create unique index certificates_certificate_no_idx on public.certificates (certificate_no);

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
