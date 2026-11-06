# Plano de Desenvolvimento — Controle Financeiro

> **Status: aguardando aprovação.** Nenhum código de aplicação foi criado.
> Este documento é a entrega da etapa de planejamento exigida no item 2 do briefing.
> **Data:** 06/11/2026

---

## 1. Contexto e objetivo

Sistema web para controlar as despesas mensais de duas pessoas (Esposo e Esposa), com um único acesso compartilhado por senha, banco Supabase e publicação estática no GitHub Pages.

O workspace está vazio; o projeto será criado na raiz, do zero. O ambiente já tem Node 24 e pnpm 11 disponíveis.

**Princípios que vão guiar todas as decisões:**

1. Simplicidade antes de recursos.
2. Cálculo financeiro correto e à prova de duplicidade.
3. Nada de dados fictícios na versão final.
4. Nenhum botão sem função.
5. Mobile e desktop com a mesma qualidade de uso.
6. Nenhuma chave administrativa no frontend.

---

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| UI | React + TypeScript | Exigido; tipagem reduz erro em valores e status |
| Build | Vite | Exigido; build estático ideal para Pages |
| Estilo | Tailwind CSS v4 | Exigido; velocidade e consistência sem CSS solto |
| Backend | Supabase (Postgres + Auth + Realtime) | Exigido; um só serviço para banco, login e tempo real |
| Gráficos | Recharts | Exigido; responsivo e simples |
| PDF | jsPDF + `jspdf-autotable` | Exigido; tabelas com paginação, 100% no navegador |
| Rotas | React Router com `HashRouter` | Compatível com GitHub Pages sem regra de servidor |
| Ícones | `lucide-react` | Leve, discreto, sem imagens decorativas |
| Testes | Vitest | Testar dinheiro, datas e projeção sem infraestrutura extra |
| Pacotes | pnpm + lockfile | Build reprodutível no Actions |

Versões estáveis serão fixadas na Etapa 1 (sem betas). O `package.json` e o lockfile ficam versionados.

**Decisões que evitam bugs comuns:**

- **Dinheiro em centavos (`bigint`)**, nunca `float`. Toda soma é inteira; a formatação para `R$ 1.234,56` acontece só na exibição.
- **Datas de referência como `YYYY-MM-01`** e construção de datas no fuso local, sem `new Date("string")` (que desloca o dia).
- **Uma única fonte de verdade para "pago"**: `paid_at` (nulo = pendente). Não existe flag `pago` paralela para dessincronizar.
- **Geração mensal idempotente no banco**, com índice único, para que nenhum clique ou recarregamento duplique lançamentos.

---

## 3. Estrutura de páginas e rotas

| Rota | Acesso | Página |
|---|---|---|
| `#/login` | Público | Entrada por senha |
| `#/perfil` | Sessão ativa | Seleção Esposo / Esposa |
| `#/` | Sessão + perfil | Início (resumo do mês) |
| `#/contas` | Sessão + perfil | Contas do mês + recorrências |
| `#/fluxo` | Sessão + perfil | Fluxo financeiro e saldo |
| `#/relatorios` | Sessão + perfil | Gráficos, relatórios e PDF |
| `#/configuracoes` | Sessão + perfil | Perfis, categorias e saída |

Regras de navegação:

- Sem sessão, qualquer rota cai em `#/login`.
- Com sessão e sem perfil escolhido, cai em `#/perfil`.
- A navegação principal tem exatamente os 5 itens pedidos. Nada além disso.
- Sidebar no desktop; barra inferior fixa com os mesmos 5 itens no mobile.
- Mês/ano selecionado é compartilhado entre Início, Contas, Fluxo e Relatórios (contexto + `localStorage`), para o usuário não recomeçar a seleção a cada tela.

### 3.1 Login (`#/login`)

Conteúdo da tela, integralmente:

- Título: **Controle Financeiro**.
- Campo **Senha**.
- Botão **Entrar**.

Sem logo, sem frases, sem rodapé, sem link de cadastro, sem “esqueci a senha”, sem exibir e-mail. Erros aparecem em uma linha discreta abaixo do campo (“Senha incorreta.”). Botão desabilitado enquanto envia.

### 3.2 Seleção de perfil (`#/perfil`)

- Título curto: “Selecionar perfil”.
- Dois botões/cartões: **Esposo** e **Esposa**.
- A escolha fica salva localmente e é validada contra a tabela `profiles`.
- Não cria conta, não pede senha de novo.

### 3.3 Início (`#/`)

- Seletor de mês/ano.
- Quatro indicadores: **Saldo disponível**, **Pendente no mês**, **Pago no mês**, **Saldo projetado**.
- Bloco **Próximos vencimentos** com até 6 contas pendentes do mês, ordenadas por vencimento, com destaque:
  - vencida → vermelho;
  - vence em até 7 dias → amarelo;
  - paga → verde (aparece em resumo/contadores, não na lista de pendentes).
- Contadores discretos de vencidas, próximas e pagas.
- Sem gráficos nesta página (gráficos ficam em Relatórios).

### 3.4 Contas (`#/contas`)

Duas abas internas: **Lançamentos** e **Recorrências**.

**Lançamentos**

- Seletor de mês/ano + botão **Nova conta**.
- Filtros: Todas · Pendentes · Pagas · Vencidas.
- Resumo da aba: total do mês, pago, pendente.
- Desktop: tabela com Nome, Categoria, Vencimento, Tipo, Perfil, Valor, Status/Pago em, checkbox e ações.
- Mobile: lista de cartões com as mesmas informações e ações.
- Checkbox marca/desmarca pagamento (com data automática, desfazer e rollback em caso de erro).
- Ações por lançamento: editar, excluir.

**Recorrências**

- Lista das contas fixas com nome, categoria, dia de vencimento, valor, início, perfil e situação (ativa/pausada).
- Ações: editar, pausar/reativar, excluir.
- Botão **Nova conta fixa** (o mesmo formulário de Nova conta, no tipo Fixa).

### 3.5 Fluxo financeiro (`#/fluxo`)

- Cartão grande com o **saldo disponível** atual, data/hora e perfil que informou.
- Botão **Atualizar saldo** (modal com valor).
- Quatro indicadores: saldo disponível, pendente do mês, pago do mês, saldo projetado.
- Fórmula visível em uma linha: “Saldo projetado = saldo disponível − contas pendentes do mês”.
- Histórico de saldos em tabela (data/hora, valor, perfil), do mais recente para o mais antigo.

### 3.6 Relatórios (`#/relatorios`)

- Seletor de mês/ano + botão **Gerar PDF**.
- Gráficos:
  1. Despesas por categoria (pizza).
  2. Comparativo mensal (barras, últimos 6 meses).
  3. Pagas versus pendentes (barras ou rosca, mês selecionado).
  4. Evolução dos gastos (linha, últimos 12 meses).
- Relatórios em abas/tabelas:
  - Despesas do mês.
  - Contas pagas.
  - Contas pendentes.
  - Contas vencidas.
  - Histórico mensal (12 meses: total, pago, pendente).
- Estados vazios claros; nunca gráfico com dados inventados.

### 3.7 Configurações (`#/configuracoes`)

- **Perfis**: cartões Esposo e Esposa com edição do nome.
- **Categorias**: lista com edição inline e formulário de nova categoria.
- **Sessão**: perfil em uso, trocar perfil e **Sair**.
- Nenhuma opção além do pedido.

---

## 4. Organização dos componentes

```text
src/
├─ main.tsx / App.tsx / index.css
├─ lib/
│  ├─ supabase.ts        cliente Supabase (só URL + anon key)
│  ├─ env.ts             leitura e validação das variáveis Vite
│  ├─ money.ts           centavos ↔ texto pt-BR, arredondamento seguro
│  ├─ dates.ts           mês de referência, dias do mês, vencimentos, fuso local
│  ├─ finance.ts         somas, projeção, status de vencimento
│  └─ pdf.ts             montagem do relatório em jsPDF
├─ types/db.ts           tipos das tabelas e enums do domínio
├─ auth/
│  ├─ SessionProvider.tsx
│  ├─ ProfileProvider.tsx
│  ├─ RequireSession.tsx / RequireProfile.tsx
│  ├─ LoginPage.tsx
│  └─ ProfileSelectPage.tsx
├─ data/
│  ├─ api.ts             consultas e mutações tipadas
│  ├─ useMonthData.ts    despesas do mês + geração preguiçosa
│  ├─ useReferenceData.ts perfis e categorias
│  ├─ useBalance.ts      saldo atual + histórico
│  └─ useRealtimeRefresh.ts assinatura única e revalidação
├─ components/
│  ├─ layout/            AppShell, Sidebar, BottomNav, PageHeader, MonthPicker
│  ├─ ui/                Button, Input, Select, MoneyInput, Modal, ConfirmDialog,
│  │                     Card, Badge, EmptyState, Spinner, Toast
│  └─ expenses/          ExpenseFormModal, RecurrenceFormModal, ExpenseTable,
│                        ExpenseList, ExpenseActions, StatusBadge, PaymentCheckbox
├─ features/
│  ├─ dashboard/         SummaryCards, UpcomingDueList
│  ├─ cashflow/          BalanceModal, BalanceHistoryTable
│  ├─ reports/           CategoryChart, MonthlyComparisonChart, StatusChart,
│  │                     EvolutionChart, ReportTables, ExportPdfButton
│  └─ settings/          ProfilesSection, CategoriesSection, SessionSection
└─ pages/                DashboardPage, ExpensesPage, CashFlowPage,
                         ReportsPage, SettingsPage
```

Critérios:

- Páginas orquestram; regra de negócio fica em `lib` e `data`.
- Formulários controlados com validação própria (sem biblioteca extra de formulário).
- Um único primitivo de modal acessível (foco, ESC, clique no fundo) reutilizado por todos.
- Nenhum componente gigante: tabela e lista mobile separadas, mas alimentadas pela mesma fonte.
- Estados de carregando, vazio, erro e sucesso em todas as telas.

---

## 5. Banco de dados (Supabase)

### 5.1 Visão geral

```text
profiles (2 registros fixos: Esposo, Esposa)
   ▲ profile_id
   │
categories ◄── expense_recurrences ──► expenses
                   (modelo)              (ocorrência do mês)
                                            │
bank_balance_history (retratos do saldo)    └── paid_at define pago/pendente
```

- `expenses` é a tabela central: cada linha é **um lançamento de um mês**.
- `expense_recurrences` é o **modelo** da conta fixa; não é exibida como despesa.
- `bank_balance_history` guarda cada saldo informado; o saldo atual é o registro mais recente (não é soma).
- `profiles` tem exatamente dois registros, com UUIDs fixos.
- Todas as tabelas guardam `created_by = auth.uid()` para vínculo com a sessão autenticada e `profile_id` para identificar quem lançou/ informou.

### 5.2 DDL resumido

```sql
-- Perfis fixos da família (não são contas de login)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_recurrences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category_id uuid not null references public.categories(id),
  amount_cents bigint not null check (amount_cents > 0),
  due_day smallint not null check (due_day between 1 and 31),
  start_month date not null check (start_month = date_trunc('month', start_month)::date),
  end_month date check (end_month is null or
    (end_month = date_trunc('month', end_month)::date and end_month >= start_month)),
  is_active boolean not null default true,
  notes text,
  profile_id uuid not null references public.profiles(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  recurrence_id uuid references public.expense_recurrences(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category_id uuid not null references public.categories(id),
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  reference_month date not null check (reference_month = date_trunc('month', reference_month)::date),
  type text not null check (type in ('fixed', 'episodic')),
  notes text check (notes is null or char_length(notes) <= 500),
  paid_at timestamptz,
  status text generated always as
    (case when paid_at is null then 'pending' else 'paid' end) stored,
  profile_id uuid not null references public.profiles(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (recurrence_id, reference_month),
  check (due_date between reference_month and (reference_month + interval '1 month - 1 day'))
);

create table public.bank_balance_history (
  id uuid primary key default gen_random_uuid(),
  amount_cents bigint not null,
  recorded_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
```

Índices: `expenses(reference_month)` e `expenses(due_date)` (com `where deleted_at is null`), `expenses(recurrence_id)`, `bank_balance_history(recorded_at desc)`.

### 5.3 Por que `unique (recurrence_id, reference_month)`

- Garante no banco que uma conta fixa só pode ter **um lançamento por mês**.
- A geração mensal usa `on conflict do nothing`; recarregar, abrir em dois celulares ou clicar duas vezes não duplica nada.
- Lançamentos esporádicos têm `recurrence_id = null`; no Postgres, vários nulos não conflitam, então não impede despesas avulsas.
- Exclusão de lançamento é **lógica** (`deleted_at`), então a linha continua ocupando aquele mês e não “ressuscita” na próxima geração.

### 5.4 Geração automática dos meses

Não haverá cron nem Edge Function. A geração é **preguiçosa e idempotente**, via função SQL chamada pelo app:

```text
generate_recurring_expenses(p_start date, p_end date) returns integer
```

- Percorre os meses do intervalo; para cada recorrência ativa cujo `start_month`/`end_month` cobre o mês, insere o lançamento que faltar.
- Vencimento = `due_day` limitado ao último dia do mês (dia 31 em fevereiro vira 28/29).
- Ao abrir o app e ao trocar o mês, o app garante **11 meses anteriores + o mês selecionado + o mês seguinte**, o que também alimenta os gráficos históricos. O custo é mínimo e não há risco de duplicar.
- Ao criar/editar uma recorrência, o app chama a geração de novo.

### 5.5 Segurança (RLS)

- RLS habilitado em **todas** as tabelas.
- `anon`: nenhum acesso (nem leitura).
- `authenticated`: acesso somente às tabelas da família (nesta aplicação, a sessão autenticada é a família).
- `profiles`: `select`/`update` para autenticados; sem insert/delete pela API.
- `categories`: `select`/`insert`/`update`; sem delete para não quebrar histórico.
- `expenses`, `expense_recurrences`, `bank_balance_history`: `select`/`insert`/`update`/`delete` para autenticados.
- Funções SQL com `security invoker` e `execute` revogado de `anon`.
- A chave `service_role` **não aparece em nenhum arquivo** do frontend, workflow ou repositório.

### 5.6 Realtime

Publicação `supabase_realtime` habilitada para `expenses`, `expense_recurrences`, `bank_balance_history`, `categories` e `profiles`.

O app mantém **um único canal**. Ao receber qualquer evento, invalida/recarrega os dados visíveis (com debounce curto). Assim, se o Esposo marcar uma conta como paga, a tela da Esposa atualiza sozinha. O evento é só um sinal; a verdade vem sempre do banco.

---

## 6. Autenticação e perfis

### 6.1 Acesso compartilhado

1. Existe **um único usuário no Supabase Auth**, criado manualmente no painel.
2. O e-mail desse usuário fica em `VITE_SHARED_EMAIL` e nunca é exibido na interface.
3. A tela de login tem apenas o campo de senha; ao enviar, o app chama `signInWithPassword({ email: VITE_SHARED_EMAIL, password })`.
4. Acertou → sessão criada. Errou → mensagem genérica, sem revelar e-mail ou detalhes.
5. A sessão é persistida pelo `supabase-js` (refresh automático). Recarregar a página não pede senha de novo.
6. **Sair** encerra a sessão e limpa o perfil selecionado.

Sem cadastro público, sem “esqueci a senha”, sem login social. A troca de senha é feita no painel do Supabase e documentada no README.

### 6.2 Perfis

- `profiles` é semeada com dois registros fixos: **Esposo** e **Esposa**.
- Perfil não é conta de login: os dois compartilham a mesma sessão, o mesmo banco e os mesmos dados.
- Após o login, o usuário escolhe o perfil; a escolha é guardada localmente e validada no banco.
- Todo lançamento, recorrência e saldo registra `profile_id` (quem cadastrou/informou).
- O formulário de conta permite escolher o perfil responsável, com padrão no perfil em uso.
- Editar o nome de um perfil em Configurações reflete em todo o app.

### 6.3 Limite de segurança (transparência)

O e-mail fixo e a `anon key` ficam embutidos no bundle, como é normal em apps Supabase. A senha **não** fica no código nem em variável de ambiente: é digitada pelo usuário. Quem tiver a senha tem acesso aos dados da família — esse é o modelo pedido (acesso único compartilhado). As políticas RLS impedem acesso sem sessão autenticada.

---

## 7. Fluxo financeiro e cálculos

### 7.1 Definições

- **Mês de referência**: competência do lançamento (`reference_month`). Todos os indicadores do mês usam essa data, não a data de pagamento.
- **Pago**: `paid_at` preenchido. **Data do pagamento**: `paid_at` (registrada no clique, desfeita ao desmarcar).
- **Pendente**: `paid_at` nulo e não excluído.
- **Vencida**: pendente com `due_date < hoje`.
- **Próxima**: pendente com `0 ≤ due_date − hoje ≤ 7`.
- **Saldo disponível**: `amount_cents` do registro mais recente de `bank_balance_history`.
- **Saldo projetado**: `saldo disponível − soma dos pendentes do mês selecionado`.

### 7.2 Fórmulas

```text
total_pago_mes      = Σ amount_cents (paid_at ≠ null, reference_month = mês)
total_pendente_mes  = Σ amount_cents (paid_at = null, reference_month = mês, deleted_at = null)
saldo_projetado     = saldo_disponível − total_pendente_mes
```

- Contas pagas **não entram** no projetado, porque o saldo informado já reflete essas saídas. É exatamente a regra do briefing.
- O histórico de saldos nunca é somado; só o último registro vale. Lançar um saldo novo substitui o “atual” sem apagar o histórico.
- Um pagamento é um único `paid_at`; marcar/desmarcar é idempotente e os totais são recalculados a partir das linhas — impossível contar duas vezes.
- Todos os cálculos são em centavos inteiros; a soma é feita antes de formatar.
- Se o saldo ainda não foi informado, os cartões mostram “—” e um atalho para o Fluxo financeiro, em vez de zeros enganosos.

### 7.3 Onde cada informação aparece

| Indicador | Início | Fluxo | Relatórios/PDF |
|---|---|---|---|
| Saldo disponível | sim | sim | sim |
| Total pendente | sim | sim | sim |
| Total pago | sim | sim | sim |
| Saldo projetado | sim | sim | sim |
| Próximos vencimentos | sim | — | lista de pendentes |
| Histórico de saldos | — | sim | — |
| Gráficos | — | — | sim |

---

## 8. Contas fixas, esporádicas e recorrências

### 8.1 Cadastro

Campos do formulário: nome, categoria, valor, data de vencimento, tipo (Fixa/Esporádica), perfil responsável, observação opcional.

- **Esporádica**: gera um único lançamento no mês da data de vencimento.
- **Fixa**: cria a recorrência e gera o lançamento do mês escolhido; os meses seguintes são gerados automaticamente ao serem abertos/garantidos.
- Validação: nome 1–80, categoria obrigatória, valor > 0 e dentro do limite, vencimento válido, perfil obrigatório, observação ≤ 500. Erros inline, foco no primeiro campo inválido.
- Duplicidade: bloqueada no banco para fixas. Para esporádicas idênticas (mesmo nome, valor e vencimento no mês), o formulário avisa e pede confirmação explícita.

### 8.2 Regras de edição (proteção dos meses anteriores)

| Ação | Efeito |
|---|---|
| Editar um lançamento do mês | Altera **somente aquela linha**; meses anteriores e seguintes intactos |
| Editar a recorrência | Altera o modelo. Opcionalmente atualiza lançamentos **pendentes do mês selecionado em diante** (checkbox no formulário); nunca toca em pagos nem em meses anteriores |
| Pausar recorrência | Para de gerar novos meses; lançamentos existentes permanecem (podem ser pagos ou excluídos) |
| Reativar | Volta a gerar do mês atual/selecionado em diante |
| Excluir recorrência | Remove o modelo e os lançamentos **não pagos a partir do mês selecionado**; pagos e meses anteriores ficam como histórico |
| Excluir um lançamento | Exclusão lógica; não é recriado pela geração automática |

- O vencimento de uma fixa fica sempre dentro do mês de referência (dia limitado ao último dia do mês).
- Alterar o valor de um mês não altera o modelo; alterar o modelo não altera meses anteriores.
- Toda ação destrutiva pede confirmação com texto claro do que será afetado.

### 8.3 Checklist de pagamentos

- Checkbox em cada linha/cartão.
- Marcar: grava `paid_at = now()`, mostra a data, atualiza totais e fluxo na hora (otimista com rollback se o banco falhar).
- Desmarcar: `paid_at = null`, data some, totais recalculam.
- Itens pagos ficam verdes e visíveis no filtro “Pagas”.

---

## 9. Relatórios e PDF

### 9.1 Gráficos (Recharts)

| Gráfico | Dados | Tipo |
|---|---|---|
| Despesas por categoria | valores do mês por categoria (todas as contas do mês) | pizza com legenda |
| Comparativo mensal | total dos últimos 6 meses | barras |
| Pagas × pendentes | somas do mês | barras/rosca |
| Evolução dos gastos | total e pago dos últimos 12 meses | linha |

- Tooltip em reais, eixos compactos (`R$ 1,2 mil`), cores consistentes com os status.
- Sem dados: estado vazio textual; nunca números fictícios.
- Responsivos (altura fixa, largura do container).

### 9.2 Tabelas de relatório

Despesas do mês, pagas, pendentes, vencidas e histórico mensal (12 meses). Filtros da página afetam as tabelas e o PDF.

### 9.3 PDF (jsPDF + autotable)

Estrutura em A4 retrato:

1. Cabeçalho: **Controle Financeiro**, mês/ano por extenso, data/hora de emissão.
2. Bloco de indicadores: saldo bancário, total pago, total pendente, saldo projetado.
3. Gráfico de barras por categoria e barra pago × pendente desenhados em vetor no PDF (sem depender de captura de tela; funciona offline e sai nítido).
4. Tabela de despesas do mês: nome, categoria, vencimento, status, valor — com paginação e total no rodapé.
5. Rodapé com “Página X de Y”.
6. Nome do arquivo: `controle-financeiro-AAAA-MM.pdf`.

Fonte Helvetica (suporta acentos), valores em pt-BR, layout sóbrio em preto/cinza com destaques verde/vermelho/amarelo.

---

## 10. Design e responsividade

- Fundo neutro claro; cartões brancos com borda sutil e sombra mínima; tipografia do sistema (rápida, sem fonte externa).
- Cores: neutro (slate), primário verde-esmeralda; **verde** = pago/positivo, **vermelho** = vencido/negativo, **amarelo** = pendente/próximo.
- Nada de gradientes, ilustrações, frases motivacionais ou menus extras.
- Desktop: sidebar fixa + conteúdo em até ~1200 px.
- Mobile: cabeçalho compacto + navegação inferior com 5 itens; tabelas viram cartões; formulários em tela cheia quando necessário.
- Acessibilidade: labels em todos os campos, foco visível, contraste, ESC fecha modal, checkbox com label, botões com `aria-label` quando só têm ícone.
- Feedback: spinner em ações assíncronas, toast de sucesso/erro, confirmação para exclusões.

---

## 11. Publicação no GitHub Pages

### 11.1 Configuração do Vite

- `base: process.env.VITE_BASE_PATH ?? '/'`.
- No GitHub Actions, `VITE_BASE_PATH=/${{ github.event.repository.name }}/` (project page) — ou variável de repositório para caso de user page/domínio próprio.
- `HashRouter`: rotas como `#/contas` não dependem de rewrite no servidor e funcionam em qualquer subpasta.
- `.nojekyll` em `public/` para o Pages não processar os artefatos.

### 11.2 Workflow `.github/workflows/deploy.yml`

- Gatilho: push na `main` + execução manual.
- Permissões: `contents: read`, `pages: write`, `id-token: write`; concorrência por grupo `pages`.
- Passos: checkout → pnpm (versão do `packageManager`) → Node 22 com cache → `pnpm install --frozen-lockfile` → `pnpm build` (com secrets das variáveis Vite) → `configure-pages` → `upload-pages-artifact` (`dist`) → job `deploy` com `actions/deploy-pages`.
- Secrets necessários: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SHARED_EMAIL`.

### 11.3 Passos manuais documentados no README

1. Criar o projeto no Supabase.
2. Rodar `supabase/schema.sql` no SQL Editor.
3. Criar **um** usuário em Authentication → Users (e-mail fixo, senha compartilhada, auto-confirmado).
4. Desativar cadastro público em Authentication → Providers → Email.
5. Copiar URL e `anon key` para `.env.local` (desenvolvimento) e para os secrets do GitHub.
6. Criar repositório, enviar o código.
7. Settings → Pages → Source: **GitHub Actions**.
8. Push na `main`; a URL final é `https://<usuario>.github.io/<repositorio>/`.
9. Para domínio próprio, ajustar `VITE_BASE_PATH` para `/` e o domínio no Pages.

### 11.4 Limitações do Pages (e como são tratadas)

- Site estático: sem servidor próprio, sem cron, sem segredos de backend. Toda a lógica sensível fica no Postgres/RLS.
- Sem rewrite de rotas: resolvido com hash router.
- Build precisa das variáveis em tempo de build: secrets do Actions.

---

## 12. Variáveis de ambiente

| Variável | Onde | Exemplo | Observação |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` + secret | `https://xxxx.supabase.co` | pública por natureza |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + secret | `eyJ...` | pública; protegida por RLS |
| `VITE_SHARED_EMAIL` | `.env.local` + secret | `familia@exemplo.com` | nunca exibida na tela; fica no bundle |
| `VITE_BASE_PATH` | build/Actions | `/controle-financeiro/` | opcional; padrão `/` |

- `.env.example` versionado; `.env.local` no `.gitignore`.
- **Nunca**: `SUPABASE_SERVICE_ROLE_KEY` no frontend, no Actions ou no repositório.
- Se as variáveis faltarem, o app mostra uma tela de configuração pendente (sem quebrar) explicando o que falta — e não permite login.

---

## 13. Validação, testes e critérios de aceite

### 13.1 Automatizáveis

- `tsc --noEmit` sem erros.
- `pnpm build` de produção sem warnings críticos.
- Vitest para:
  - parse/formatação de centavos e reais (`1.234,56`, `0,01`, valores inválidos);
  - aritmética de meses (dezembro→janeiro, fevereiro bissexto, dia 31);
  - totais pago/pendente e projeção (incluindo o caso “pago não desconta de novo”);
  - classificação vencida/próxima/paga nas bordas (hoje, 7 dias).
- Revisão do SQL: constraints, RLS, funções idempotentes.

### 13.2 Teste de ponta a ponta

Depende de um projeto Supabase real. Com URL, anon key, e-mail e senha de teste, executo um script temporário (fora do app) para:

- validar que `anon` não lê dados;
- autenticar com o usuário compartilhado;
- criar/editar/pagar/desfazer contas e conferir totais;
- gerar dois meses e provar que não duplica;
- testar pausar/excluir recorrência;
- limpar todos os dados de teste ao final.

Sem credenciais, entrego o SQL + README e um checklist de aceite para o usuário executar.

### 13.3 Checklist de aceite (manual)

1. Login com senha errada e correta; e-mail nunca aparece.
2. Escolher perfil; recarregar mantém; “Sair” volta ao login.
3. Cadastrar conta esporádica e conferir no mês certo.
4. Cadastrar fixa; conferir mês atual e seguinte (sem duplicar).
5. Editar um mês sem alterar o anterior.
6. Pausar/reativar/excluir recorrência conforme as regras.
7. Marcar e desmarcar pagamento; data e totais corretos.
8. Atualizar saldo; histórico; projeção = saldo − pendentes.
9. Gráficos e PDF com os mesmos números da tela.
10. Renomear perfil/categoria reflete no app.
11. Duas abas/dispositivos atualizam via realtime.
12. Layout em 360 px, 768 px e desktop.
13. Build com `VITE_BASE_PATH` e acesso via URL do Pages.
14. Requisição sem sessão negada pelo RLS.

---

## 14. Etapas de desenvolvimento

Cada etapa termina com build/verificação e um relatório curto do que foi feito e testado. Só avanço após a etapa estar estável.

| Etapa | Entrega | Verificação |
|---|---|---|
| **0. Aprovação** | Este plano | Aprovação do usuário |
| **1. Fundação** | Vite + React + TS + Tailwind, tema, rotas, shell responsivo, env, `.env.example`, README inicial, git init | `pnpm build`, navegação vazia em 360 px e desktop |
| **2. Banco** | `supabase/schema.sql` (tabelas, índices, RLS, seeds, funções), tipos TS, guia de configuração | revisão SQL, constraints, RLS; dry-run se houver Supabase |
| **3. Autenticação e perfis** | Login mínimo, seleção de perfil, guards, sessão, logout | login real (se credenciais), refresh, rota protegida |
| **4. Contas** | CRUD esporádicas, recorrências (criar/editar/pausar/excluir), geração mensal, checklist, filtros, validações | testes de cálculo + cenários de duplicidade/edição |
| **5. Início e Fluxo** | KPIs, próximos vencimentos, saldo/histórico, projeção, realtime | conferência manual dos números + testes unitários |
| **6. Relatórios e PDF** | 4 gráficos, 5 relatórios, exportação PDF | números iguais aos da tela; PDF em A4 |
| **7. Configurações** | Perfis, categorias, troca de perfil, sair | edições refletindo em todo o app |
| **8. Publicação e QA** | Workflow Pages, base path, `.nojekyll`, README final, checklist completo | build local com base path, revisão final, instruções de deploy |

---

## 15. Decisões que preciso confirmar

1. **Abrangência do saldo projetado**: proponho **saldo disponível − pendentes do mês selecionado** (os indicadores da tela são mensais). A alternativa seria descontar todas as pendências futuras; não recomendo, pois mistura meses.
2. **Geração mensal preguiçosa** (sem cron): os meses seguintes aparecem automaticamente ao serem abertos. É mais simples e à prova de falha; não gera linhas infinitas.
3. **Regras de exclusão de recorrência** descritas no item 8.2 (remove não pagos do mês selecionado em diante; preserva histórico).
4. **Projeto Supabase**: preciso de credenciais para o teste ponta a ponta; sem elas, entrego SQL + instruções e o checklist fica com você.
5. **Repositório GitHub**: o workflow já sai pronto; o push e a ativação do Pages dependem do seu repositório (não tenho acesso a ele).

---

## 16. Fora de escopo (para manter simples)

- Contas individuais com senhas diferentes.
- Receitas, investimentos, cartões, parcelamentos, orçamento por categoria.
- Multifamília, múltiplos usuários, convites.
- Anexos, notificações por e-mail/push, WhatsApp.
- Modo escuro, PWA/offline, i18n.
- Edição retroativa de histórico de saldo.

Se algum desses for necessário, entra como fase futura.

---

## 17. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| E-mail fixo visível no bundle | é inerente ao modelo pedido; não é segredo; senha nunca é armazenada |
| Duplicidade de contas fixas | índice único + geração idempotente + testes |
| Cálculo com centavos errado | inteiros + testes unitários + soma no cliente/SQL consistente |
| Fuso horário mudar o dia do vencimento | datas locais construídas manualmente; `reference_month` explícito |
| RLS mal configurado | políticas por tabela, teste com anon, revisão final |
| PDF com gráficos “quebrados” | gráficos vetoriais desenhados no jsPDF, sem captura de tela |
| Pages em subpasta | `base` configurável + hash router + teste de build |

---

**Aprovação:** este é o plano completo. Com o “ok”, inicio a Etapa 1 e sigo etapa por etapa, reportando cada entrega e as verificações.
