-- Rode uma vez no SQL Editor do Supabase (projeto já existente).
-- Cria a função usada pelo workflow keep-alive para manter o projeto ativo.
create or replace function public.keep_alive()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

revoke all on function public.keep_alive() from PUBLIC;
grant execute on function public.keep_alive() to anon, authenticated;
