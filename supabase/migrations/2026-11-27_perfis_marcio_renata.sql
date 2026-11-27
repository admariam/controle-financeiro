-- Rode uma vez no SQL Editor do Supabase (projeto já existente).
-- Renomeia os dois perfis da casa. O login continua sendo um só, compartilhado.
-- As contas já cadastradas continuam ligadas ao mesmo perfil (o id não muda).
update public.profiles set name = 'Marcio'
  where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set name = 'Renata'
  where id = '00000000-0000-0000-0000-000000000002';

select id, name from public.profiles order by id;
