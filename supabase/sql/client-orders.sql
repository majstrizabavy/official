-- Klientska zona "Moja akcia" - MVP.
-- Spusti v Supabase SQL Editore.
-- Pred pouzitim vloz admin email do public.admin_users.

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create table if not exists public.client_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_email text not null,
  title text not null,
  event_date date,
  location text,
  status text not null default 'draft',
  price numeric,
  services text,
  notes text,
  program_text text,
  program_status text not null default 'draft',
  program_sent_at timestamptz,
  client_response_note text,
  client_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_orders_status_check check (
    status in ('draft', 'sent', 'confirmed', 'in_progress', 'done', 'cancelled')
  )
);

create index if not exists client_orders_user_id_idx on public.client_orders(user_id);
create index if not exists client_orders_client_email_idx on public.client_orders(lower(client_email));
create index if not exists client_orders_event_date_idx on public.client_orders(event_date);

create or replace function public.set_client_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_orders_updated_at on public.client_orders;
create trigger set_client_orders_updated_at
before update on public.client_orders
for each row
execute function public.set_client_orders_updated_at();

alter table public.client_orders enable row level security;

drop policy if exists "Clients can read own orders" on public.client_orders;
create policy "Clients can read own orders"
on public.client_orders
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Admins can create client orders" on public.client_orders;
create policy "Admins can create client orders"
on public.client_orders
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update client orders" on public.client_orders;
create policy "Admins can update client orders"
on public.client_orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop function if exists public.create_client_order_for_email(
  text, text, date, text, text, numeric, text, text
);

create or replace function public.create_client_order_for_email(
  p_client_email text,
  p_title text,
  p_event_date date,
  p_location text,
  p_status text,
  p_price numeric,
  p_services text,
  p_notes text,
  p_program_text text default null,
  p_program_status text default 'draft',
  p_program_sent_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_email text;
  v_user_id uuid;
  v_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Nemas opravnenie vytvarat klientske objednavky.';
  end if;

  v_client_email := lower(trim(p_client_email));

  if v_client_email is null or v_client_email = '' then
    raise exception 'Email klienta je povinny.';
  end if;

  select auth_user.id
  into v_user_id
  from auth.users as auth_user
  where lower(auth_user.email) = v_client_email
  limit 1;

  if v_user_id is null then
    raise exception 'Klient s emailom % este nie je registrovany.', p_client_email;
  end if;

  insert into public.client_orders (
    user_id,
    client_email,
    title,
    event_date,
    location,
    status,
    price,
    services,
    notes,
    program_text,
    program_status,
    program_sent_at
  )
  values (
    v_user_id,
    v_client_email,
    p_title,
    p_event_date,
    p_location,
    coalesce(nullif(p_status, ''), 'draft'),
    p_price,
    p_services,
    p_notes,
    nullif(trim(coalesce(p_program_text, '')), ''),
    coalesce(nullif(p_program_status, ''), 'draft'),
    case
      when coalesce(nullif(p_program_status, ''), 'draft') = 'sent'
        then coalesce(p_program_sent_at, now())
      else p_program_sent_at
    end
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function public.create_client_order_for_email(
  text, text, date, text, text, numeric, text, text, text, text, timestamptz
) from public;

revoke execute on function public.create_client_order_for_email(
  text, text, date, text, text, numeric, text, text, text, text, timestamptz
) from anon;

grant execute on function public.create_client_order_for_email(
  text, text, date, text, text, numeric, text, text, text, text, timestamptz
) to authenticated;

-- Priklad:
-- insert into public.admin_users(email) values ('tvoj-admin-email@example.com')
-- on conflict (email) do nothing;
