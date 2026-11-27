# Configuração do Supabase

Este diretório contém o esquema completo do banco. Execute-o **uma vez** em um projeto Supabase novo.

## 1. Criar o projeto

1. Acesse <https://supabase.com> e crie um projeto.
2. Guarde a senha do banco (não é a senha do sistema) em local seguro.
3. Aguarde o provisionamento terminar.

## 2. Criar as tabelas

1. No painel do projeto, abra **SQL Editor**.
2. Cole todo o conteúdo de [`schema.sql`](./schema.sql).
3. Clique em **Run**.

O script é idempotente naquilo que importa: pode ser executado novamente para atualizar funções e políticas, mas foi pensado para rodar em um projeto vazio.

Ele cria:

| Tabela | Conteúdo |
|---|---|
| `profiles` | Marcio e Renata, com UUIDs fixos |
| `categories` | Moradia, Alimentação, Água, Energia, Gás, Internet, Transporte, Saúde, Educação, Lazer, Empréstimos, Outros |
| `expense_recurrences` | Modelos das contas fixas |
| `expenses` | Lançamentos de cada mês |
| `bank_balance_history` | Histórico de saldos informados |

Também cria índices, gatilhos de `updated_at`, políticas RLS, permissões e as funções:

- `generate_recurring_expenses(p_start, p_end)` — gera os lançamentos fixos que faltam, sem duplicar.
- `apply_recurrence_to_pending(p_recurrence_id, p_from_month)` — atualiza pendentes a partir de um mês.
- `delete_recurrence(p_recurrence_id, p_from_month)` — exclui a recorrência e os não pagos a partir do mês.

## 3. Criar o único usuário de acesso

O sistema usa **um único acesso compartilhado**. Não crie contas para Marcio e Renata: os dois perfis existem apenas na tabela `profiles` e compartilham a mesma sessão.

1. Vá em **Authentication** → **Users**.
2. Clique em **Add user** → **Create new user**.
3. Preencha:
   - **E-mail**: o mesmo que será usado em `VITE_SHARED_EMAIL` (ex.: `familia@seudominio.com`).
   - **Senha**: a senha compartilhada do casal. Use uma senha forte.
   - Marque **Auto Confirm User** (ou confirme o e-mail).
4. Clique em **Create user**.

> A senha não fica no código, no GitHub nem no `.env`. Ela é digitada na tela de login. Para trocá-la depois, use **Authentication → Users → usuário → Reset/Update password**.

## 4. Desativar o cadastro público

1. Vá em **Authentication** → **Sign In / Providers** (o nome pode variar conforme a versão do painel).
2. Em **Email**, desative a opção de permitir novos cadastros (`Allow new users to sign up` / `Enable sign up`).
3. Não habilite login por telefone, provedores sociais ou magic link.

Assim, mesmo que alguém descubra o e-mail configurado, não consegue criar uma conta nova.

## 5. Copiar as chaves

1. Vá em **Project Settings** → **API** (ou **Data API**).
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL` (a URL base, sem `/rest/v1` no final)
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
3. **Nunca copie a `service_role` para o frontend.**

No projeto local:

```bash
cp .env.example .env.local
```

Preencha:

```dotenv
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SHARED_EMAIL=familia@seudominio.com
VITE_BASE_PATH=/
```

`VITE_SHARED_EMAIL` é o e-mail do usuário criado no passo 3. Ele não aparece em nenhuma tela.

## 6. Conferir a instalação

No SQL Editor:

```sql
select id, name from public.profiles order by name;
select name from public.categories order by sort_order;
select proname from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('generate_recurring_expenses', 'apply_recurrence_to_pending', 'delete_recurrence');
```

Devem existir dois perfis e doze categorias. As três funções devem aparecer na lista.

Teste também a proteção sem sessão (com a URL e a anon key):

```bash
curl "https://SEU-PROJETO.supabase.co/rest/v1/expenses?select=*" \
  -H "apikey: SUA_ANON_KEY"
```

A resposta deve vir vazia (`[]`) ou com erro de permissão — nunca com os dados da família. Isso confirma que o RLS está ativo.

## 7. Como as regras funcionam no banco

- **Duplicidade**: `expenses` tem `unique (recurrence_id, reference_month)`. A geração só insere o que falta.
- **Exclusão**: lançamentos e recorrências usam exclusão lógica (`deleted_at`). Um lançamento excluído não é recriado, pois a linha continua ocupando aquele mês para efeito da restrição única.
- **Cálculo**: contas pagas têm `paid_at`; pendentes têm `paid_at = null`. O status é uma coluna gerada, sem possibilidade de divergência.
- **Meses anteriores**: editar um lançamento altera só aquela linha. Editar a recorrência altera o modelo; a atualização dos pendentes é opcional e limitada ao mês escolhido em diante.
- **Saldo**: `bank_balance_history` é imutável. O saldo atual é sempre o registro mais recente; o histórico nunca é somado.

## 8. RLS e segurança

- Todas as tabelas têm Row Level Security habilitado.
- O papel `anon` não tem acesso.
- O papel `authenticated` (a sessão da família) pode ler e alterar somente os dados do sistema.
- As funções usam `security invoker`: rodam com as permissões de quem chamou e continuam sujeitas ao RLS.
- A `service_role` não é usada em nenhum lugar do projeto.

O e-mail fixo e a chave `anon` ficam no bundle do frontend, como é normal em aplicações Supabase. A proteção real vem do RLS e da senha compartilhada.

## 9. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Login sempre falha | usuário não confirmado, e-mail diferente do `VITE_SHARED_EMAIL` ou senha incorreta |
| Tela de configuração pendente | `.env.local` ausente/incompleto ou build sem as variáveis |
| Dados não atualizam em outro aparelho | Realtime desabilitado no projeto ou tabelas fora da publicação `supabase_realtime` |
| Erro ao gerar PDF | dados do mês ainda não carregados; aguarde a tela terminar de carregar |
| Categorias duplicadas | o script de seed só roda quando a tabela está vazia; limpe categorias extras manualmente |
| Login diz que o servidor não respondeu | projeto pausado por inatividade (plano gratuito); no painel, abra o projeto e clique em **Resume project** |

## 10. Evitar a pausa por inatividade

No plano gratuito, o Supabase pausa o projeto depois de 7 dias sem uso. O workflow `.github/workflows/keep-alive.yml` chama o banco a cada 3 dias usando os mesmos secrets do deploy (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).

Em projeto já existente, rode uma vez no **SQL Editor** o arquivo [`migrations/2026-11-27_keep_alive.sql`](./migrations/2026-11-27_keep_alive.sql). Ele cria a função `keep_alive()`, que só devolve a hora do servidor e não toca em nenhum dado. Projetos novos já recebem a função pelo `schema.sql`.

Para testar na hora: GitHub → **Actions** → **Manter Supabase ativo** → **Run workflow**. Se o projeto estiver pausado, a execução falha e o GitHub avisa por e-mail.

O GitHub desativa rotinas agendadas em repositórios sem nenhum commit por 60 dias. Se isso acontecer, ele avisa por e-mail; basta reativar em **Actions**.
