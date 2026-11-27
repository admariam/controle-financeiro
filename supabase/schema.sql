-- ============================================================================
-- Controle Financeiro — esquema do Supabase
-- Execute este arquivo inteiro no SQL Editor de um projeto Supabase novo.
-- Depois crie o usuário compartilhado em Authentication > Users.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Função auxiliar para atualizar updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — os dois perfis da casa, Marcio e Renata (não são contas de login)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, name)
values
  ('00000000-0000-0000-0000-000000000001', 'Marcio'),
  ('00000000-0000-0000-0000-000000000002', 'Renata')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (name, sort_order)
select seed.name, seed.sort_order
from (
  values
    ('Moradia', 1),
    ('Alimentação', 2),
    ('Água', 3),
    ('Energia', 4),
    ('Gás', 5),
    ('Internet', 6),
    ('Transporte', 7),
    ('Saúde', 8),
    ('Educação', 9),
    ('Lazer', 10),
    ('Empréstimos', 11),
    ('Outros', 12)
) as seed(name, sort_order)
where not exists (select 1 from public.categories);

-- ----------------------------------------------------------------------------
-- expense_recurrences — modelo das contas fixas
-- ----------------------------------------------------------------------------
create table if not exists public.expense_recurrences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category_id uuid not null references public.categories (id),
  amount_cents bigint not null check (amount_cents > 0),
  due_day smallint not null check (due_day between 1 and 31),
  start_month date not null check (start_month = date_trunc('month', start_month)::date),
  end_month date check (
    end_month is null
    or (
      end_month = date_trunc('month', end_month)::date
      and end_month >= start_month
    )
  ),
  is_active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  profile_id uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- expenses — um lançamento por mês
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  recurrence_id uuid references public.expense_recurrences (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category_id uuid not null references public.categories (id),
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  reference_month date not null check (reference_month = date_trunc('month', reference_month)::date),
  type text not null check (type in ('fixed', 'episodic')),
  notes text check (notes is null or char_length(notes) <= 500),
  paid_at timestamptz,
  status text generated always as (
    case when paid_at is null then 'pending' else 'paid' end
  ) stored,
  profile_id uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint expenses_unique_recurrence_month unique (recurrence_id, reference_month),
  constraint expenses_due_date_within_month check (
    due_date >= reference_month
    and due_date <= (reference_month + interval '1 month - 1 day')::date
  )
);

-- ----------------------------------------------------------------------------
-- bank_balance_history — cada saldo informado (o atual é o mais recente)
-- ----------------------------------------------------------------------------
create table if not exists public.bank_balance_history (
  id uuid primary key default gen_random_uuid(),
  amount_cents bigint not null,
  recorded_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
create index if not exists expenses_reference_month_idx
  on public.expenses (reference_month)
  where deleted_at is null;

create index if not exists expenses_pending_due_date_idx
  on public.expenses (due_date)
  where deleted_at is null and paid_at is null;

create index if not exists expenses_recurrence_idx
  on public.expenses (recurrence_id);

create index if not exists bank_balance_recorded_idx
  on public.bank_balance_history (recorded_at desc);

-- ----------------------------------------------------------------------------
-- Triggers de updated_at
-- ----------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists recurrences_set_updated_at on public.expense_recurrences;
create trigger recurrences_set_updated_at
before update on public.expense_recurrences
for each row execute function public.set_updated_at();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Funções de negócio
-- ----------------------------------------------------------------------------

-- Gera, de forma idempotente, os lançamentos das contas fixas no intervalo.
create or replace function public.generate_recurring_expenses(
  p_start date,
  p_end date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if p_start is null or p_end is null then
    raise exception 'Período inválido para geração de contas.';
  end if;

  insert into public.expenses (
    recurrence_id,
    name,
    category_id,
    amount_cents,
    due_date,
    reference_month,
    type,
    notes,
    profile_id
  )
  select
    r.id,
    r.name,
    r.category_id,
    r.amount_cents,
    (
      m.month_start::date
      + (
        least(
          r.due_day,
          extract(day from (m.month_start + interval '1 month - 1 day'))::int
        ) - 1
      )
    ),
    m.month_start::date,
    'fixed',
    r.notes,
    r.profile_id
  from public.expense_recurrences r
  cross join generate_series(
    date_trunc('month', p_start),
    date_trunc('month', p_end),
    interval '1 month'
  ) as m(month_start)
  where r.deleted_at is null
    and r.is_active
    and m.month_start::date >= r.start_month
    and (r.end_month is null or m.month_start::date <= r.end_month)
  on conflict (recurrence_id, reference_month) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Atualiza os lançamentos pendentes de uma recorrência a partir de um mês.
create or replace function public.apply_recurrence_to_pending(
  p_recurrence_id uuid,
  p_from_month date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.expenses e
  set
    name = r.name,
    category_id = r.category_id,
    amount_cents = r.amount_cents,
    notes = r.notes,
    due_date = (
      e.reference_month
      + (
        least(
          r.due_day,
          extract(day from (e.reference_month + interval '1 month - 1 day'))::int
        ) - 1
      )
    ),
    updated_at = now()
  from public.expense_recurrences r
  where r.id = p_recurrence_id
    and e.recurrence_id = r.id
    and e.deleted_at is null
    and e.paid_at is null
    and e.reference_month >= date_trunc('month', p_from_month)::date;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Exclui a recorrência e os lançamentos não pagos a partir do mês informado.
create or replace function public.delete_recurrence(
  p_recurrence_id uuid,
  p_from_month date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_deleted integer;
begin
  update public.expenses
  set deleted_at = now(), updated_at = now()
  where recurrence_id = p_recurrence_id
    and paid_at is null
    and deleted_at is null
    and reference_month >= date_trunc('month', p_from_month)::date;

  get diagnostics v_deleted = row_count;

  update public.expense_recurrences
  set is_active = false, deleted_at = now(), updated_at = now()
  where id = p_recurrence_id
    and deleted_at is null;

  return v_deleted;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expense_recurrences enable row level security;
alter table public.expenses enable row level security;
alter table public.bank_balance_history enable row level security;

-- Perfis: leitura e edição dos dois perfis da família.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles for select to authenticated using (true);

drop policy if exists profiles_update_authenticated on public.profiles;
create policy profiles_update_authenticated
  on public.profiles for update to authenticated using (true) with check (true);

-- Categorias: leitura, criação e edição.
drop policy if exists categories_select_authenticated on public.categories;
create policy categories_select_authenticated
  on public.categories for select to authenticated using (true);

drop policy if exists categories_insert_authenticated on public.categories;
create policy categories_insert_authenticated
  on public.categories for insert to authenticated with check (true);

drop policy if exists categories_update_authenticated on public.categories;
create policy categories_update_authenticated
  on public.categories for update to authenticated using (true) with check (true);

-- Recorrências: a família inteira compartilha os mesmos dados.
drop policy if exists recurrences_select_authenticated on public.expense_recurrences;
create policy recurrences_select_authenticated
  on public.expense_recurrences for select to authenticated using (true);

drop policy if exists recurrences_insert_authenticated on public.expense_recurrences;
create policy recurrences_insert_authenticated
  on public.expense_recurrences for insert to authenticated with check (true);

drop policy if exists recurrences_update_authenticated on public.expense_recurrences;
create policy recurrences_update_authenticated
  on public.expense_recurrences for update to authenticated using (true) with check (true);

-- Lançamentos: leitura, criação, edição (pagamento/exclusão lógica).
drop policy if exists expenses_select_authenticated on public.expenses;
create policy expenses_select_authenticated
  on public.expenses for select to authenticated using (true);

drop policy if exists expenses_insert_authenticated on public.expenses;
create policy expenses_insert_authenticated
  on public.expenses for insert to authenticated with check (true);

drop policy if exists expenses_update_authenticated on public.expenses;
create policy expenses_update_authenticated
  on public.expenses for update to authenticated using (true) with check (true);

-- Saldos: leitura e inclusão de um novo retrato (histórico imutável).
drop policy if exists balances_select_authenticated on public.bank_balance_history;
create policy balances_select_authenticated
  on public.bank_balance_history for select to authenticated using (true);

drop policy if exists balances_insert_authenticated on public.bank_balance_history;
create policy balances_insert_authenticated
  on public.bank_balance_history for insert to authenticated with check (true);

-- ----------------------------------------------------------------------------
-- Permissões (RLS continua sendo a barreira principal)
-- ----------------------------------------------------------------------------
revoke all on table public.profiles from anon;
revoke all on table public.categories from anon;
revoke all on table public.expense_recurrences from anon;
revoke all on table public.expenses from anon;
revoke all on table public.bank_balance_history from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.categories to authenticated;
grant select, insert, update, delete on table public.expense_recurrences to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert on table public.bank_balance_history to authenticated;

revoke all on function public.generate_recurring_expenses(date, date) from PUBLIC;
revoke all on function public.generate_recurring_expenses(date, date) from anon;
grant execute on function public.generate_recurring_expenses(date, date) to authenticated;

revoke all on function public.apply_recurrence_to_pending(uuid, date) from PUBLIC;
revoke all on function public.apply_recurrence_to_pending(uuid, date) from anon;
grant execute on function public.apply_recurrence_to_pending(uuid, date) to authenticated;

revoke all on function public.delete_recurrence(uuid, date) from PUBLIC;
revoke all on function public.delete_recurrence(uuid, date) from anon;
grant execute on function public.delete_recurrence(uuid, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Manter o projeto ativo (plano gratuito pausa após 7 dias sem uso)
-- Chamada pelo workflow .github/workflows/keep-alive.yml.
-- Não lê nem expõe nenhum dado: só confirma que o banco respondeu.
-- ----------------------------------------------------------------------------
create or replace function public.keep_alive()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

revoke all on function public.keep_alive() from PUBLIC;
grant execute on function public.keep_alive() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Realtime (idempotente)
-- ----------------------------------------------------------------------------
do $$
declare
  table_name text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach table_name in array array[
    'expenses',
    'expense_recurrences',
    'bank_balance_history',
    'categories',
    'profiles'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- Fim.
-- Próximo passo: criar o usuário compartilhado em Authentication > Users.
-- ----------------------------------------------------------------------------
