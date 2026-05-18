-- Klientske dopyty z kalkulacky "Navrhni si akciu".
-- Bez automatickej registracie klienta.
-- Spusti v Supabase SQL Editore po client-orders.sql.

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  title text not null,
  event_date date,
  location text,
  audience text,
  guest_count text,
  energy text,
  budget text,
  promo text,
  selected_variant text,
  selected_price text,
  services text,
  notes text,
  admin_note text,
  approved_order_id uuid references public.client_orders(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_requests_status_check check (
    status in ('pending', 'approved', 'rejected')
  )
);

create index if not exists client_requests_status_idx on public.client_requests(status);
create index if not exists client_requests_contact_email_idx on public.client_requests(lower(contact_email));
create index if not exists client_requests_created_at_idx on public.client_requests(created_at desc);

create or replace function public.set_client_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_requests_updated_at on public.client_requests;
create trigger set_client_requests_updated_at
before update on public.client_requests
for each row
execute function public.set_client_requests_updated_at();

alter table public.client_requests enable row level security;

drop policy if exists "Anyone can create client requests" on public.client_requests;
create policy "Anyone can create client requests"
on public.client_requests
for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Admins can read client requests" on public.client_requests;
create policy "Admins can read client requests"
on public.client_requests
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update client requests" on public.client_requests;
create policy "Admins can update client requests"
on public.client_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Klient vidi objednavku po prihlaseni rovnakym emailom.
drop policy if exists "Clients can read own orders" on public.client_orders;
create policy "Clients can read own orders"
on public.client_orders
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(client_email) = lower(auth.jwt() ->> 'email')
  or public.is_admin()
);

-- Aktualizovana verzia povoli vytvorit objednavku aj pred registraciou klienta.
alter table public.client_orders
add column if not exists program_text text,
add column if not exists program_status text not null default 'draft',
add column if not exists program_sent_at timestamptz,
add column if not exists client_response_note text,
add column if not exists client_response_at timestamptz;

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

grant execute on function public.create_client_order_for_email(
  text, text, date, text, text, numeric, text, text, text, text, timestamptz
) to authenticated;

drop function if exists public.approve_client_request(
  uuid, text, date, text, text, numeric, text, text, text
);

create or replace function public.approve_client_request(
  p_request_id uuid,
  p_title text,
  p_event_date date,
  p_location text,
  p_status text,
  p_price numeric,
  p_services text,
  p_notes text,
  p_admin_note text,
  p_program_text text default null,
  p_program_status text default 'draft',
  p_program_sent_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set lock_timeout = '5s'
set statement_timeout = '15s'
as $$
declare
  v_request public.client_requests%rowtype;
  v_order_id uuid;
  v_client_email text;
begin
  perform set_config('lock_timeout', '5000', true);
  perform set_config('statement_timeout', '15000', true);

  if not public.is_admin() then
    raise exception 'Nemas opravnenie schvalovat klientske dopyty.';
  end if;

  select *
  into v_request
  from public.client_requests
  where id = p_request_id
  for update nowait;

  if v_request.id is null then
    raise exception 'Dopyt neexistuje.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Dopyt % uz nie je v stave pending, aktualny stav: %.', p_request_id, v_request.status;
  end if;

  v_client_email := lower(trim(v_request.contact_email));

  if v_client_email is null or v_client_email = '' then
    raise exception 'Dopyt nema email klienta, objednavku nie je mozne vytvorit.';
  end if;

  if p_title is null or trim(p_title) = '' then
    raise exception 'Nazov objednavky je povinny.';
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
    null,
    v_client_email,
    trim(p_title),
    p_event_date,
    nullif(trim(coalesce(p_location, '')), ''),
    coalesce(nullif(p_status, ''), 'sent'),
    p_price,
    nullif(p_services, ''),
    nullif(p_notes, ''),
    nullif(trim(coalesce(p_program_text, '')), ''),
    coalesce(nullif(p_program_status, ''), 'draft'),
    case
      when coalesce(nullif(p_program_status, ''), 'draft') = 'sent'
        then coalesce(p_program_sent_at, now())
      else p_program_sent_at
    end
  )
  returning id into v_order_id;

  update public.client_requests
  set
    status = 'approved',
    admin_note = nullif(p_admin_note, ''),
    approved_order_id = v_order_id,
    approved_at = now(),
    approved_by = auth.uid(),
    rejected_at = null,
    rejected_by = null
  where id = p_request_id;

  return v_order_id;
exception
  when lock_not_available then
    raise exception 'Schvalenie dopytu je docasne blokovane inou databazovou operaciou. Skus to znova o chvilu.';
  when query_canceled then
    raise exception 'Schvalenie dopytu trvalo prilis dlho a bolo prerusene. Skontroluj databazove locky alebo RPC policies.';
  when others then
    raise exception 'Schvalenie dopytu zlyhalo: %', sqlerrm;
end;
$$;

grant execute on function public.approve_client_request(
  uuid, text, date, text, text, numeric, text, text, text, text, text, timestamptz
) to authenticated;
