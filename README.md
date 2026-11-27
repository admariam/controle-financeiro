# Controle Financeiro

Sistema web para controle das despesas mensais de duas pessoas (**Marcio** e **Renata**), com um único acesso compartilhado por senha, banco de dados Supabase e publicação no GitHub Pages.

O projeto foi desenvolvido a partir do plano em [`PLANO.md`](./PLANO.md).

## Funcionalidades

- Login com uma única senha e um e-mail fixo configurado por variável de ambiente.
- Seleção do perfil **Marcio** ou **Renata** após o login; os dois compartilham os mesmos dados e cada conta cadastrada registra quem a lançou.
- Início com saldo disponível, contas pendentes, contas pagas, saldo projetado e próximos vencimentos.
- Cadastro de contas esporádicas e fixas (recorrências), com categorias, perfil responsável e observação.
- Geração automática dos meses seguintes, sem cron e sem duplicar lançamentos.
- Checklist de pagamento com data, desfazer e atualização dos totais.
- Fluxo financeiro com saldo bancário, histórico de atualizações e projeção.
- Relatórios com quatro gráficos, cinco visões em tabela e exportação em PDF.
- Configurações de perfis, categorias e sessão.
- Atualização em tempo real entre dispositivos via Supabase Realtime.
- Layout responsivo (desktop, tablet e celular).

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19 + TypeScript |
| Build | Vite 8 |
| Estilo | Tailwind CSS 4 |
| Banco e autenticação | Supabase (Postgres, Auth, Realtime, RLS) |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Rotas | React Router (HashRouter) |
| Testes | Vitest |

## Requisitos

- Node.js 20.19+ ou 22.12+
- pnpm 11
- Um projeto Supabase

## Instalação local

```bash
pnpm install
cp .env.example .env.local
```

Preencha o `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
VITE_SHARED_EMAIL=acesso@exemplo.com
VITE_BASE_PATH=/
```

Depois:

```bash
pnpm dev
```

Acesse `http://localhost:5173`.

> O banco precisa estar configurado antes do primeiro login. Siga o guia em [`supabase/README.md`](./supabase/README.md).

## Configuração do Supabase

Resumo:

1. Crie um projeto no Supabase.
2. Execute todo o arquivo [`supabase/schema.sql`](./supabase/schema.sql) no **SQL Editor**.
3. Em **Authentication → Users**, crie **um único usuário** com o e-mail que será usado em `VITE_SHARED_EMAIL`, defina a senha compartilhada e marque **Auto Confirm User**.
4. Desative o cadastro público em **Authentication → Providers → Email**.
5. Copie a **Project URL** e a **anon key** para o `.env.local` e para os secrets do GitHub.

Instruções detalhadas, verificações e solução de problemas: [`supabase/README.md`](./supabase/README.md).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL do projeto Supabase (sem `/rest/v1`) |
| `VITE_SUPABASE_ANON_KEY` | sim | Chave pública (anon); protegida por RLS |
| `VITE_SHARED_EMAIL` | sim | E-mail fixo do usuário compartilhado; nunca exibido na tela |
| `VITE_BASE_PATH` | não | Caminho base do build (padrão `/`; no Pages, `/nome-do-repositorio/`) |

A **service_role** não é usada em nenhum lugar. Nunca a coloque no frontend, no GitHub ou no `.env`.

## Scripts

```bash
pnpm dev        # servidor de desenvolvimento
pnpm build      # type-check + build de produção
pnpm preview    # pré-visualização do build
pnpm test       # testes unitários (Vitest)
pnpm typecheck  # apenas a checagem de tipos
```

## Estrutura do projeto

```text
.
├─ .github/workflows/deploy.yml   # publicação no GitHub Pages
├─ public/                        # favicon, .nojekyll
├─ supabase/
│  ├─ schema.sql                  # tabelas, RLS, funções e seeds
│  └─ README.md                   # passo a passo do Supabase
├─ src/
│  ├─ auth/                       # sessão, login, seleção de perfil, guards
│  ├─ components/                 # layout e componentes de UI
│  ├─ data/                       # acesso ao Supabase, hooks e realtime
│  ├─ features/                   # contas, fluxo, relatórios e configurações
│  ├─ lib/                        # dinheiro, datas, cálculos e PDF
│  ├─ pages/                      # Início, Contas, Fluxo, Relatórios, Configurações
│  └─ types/                      # tipos do domínio
├─ .env.example
├─ pnpm-workspace.yaml
└─ vite.config.ts
```

## Regras de cálculo

Todos os valores são armazenados em **centavos inteiros** e formatados como reais apenas na exibição.

```text
total pago no mês     = soma das contas com paid_at preenchido no mês
total pendente no mês = soma das contas sem paid_at no mês
saldo projetado       = saldo bancário disponível − contas pendentes do mês
```

- Contas pagas **não** entram no saldo projetado: o saldo informado já considera essas saídas.
- O saldo atual é sempre o registro mais recente de `bank_balance_history`; o histórico não é somado.
- Um lançamento pertence ao mês de referência (`reference_month`), não ao mês em que foi pago.
- Contas vencidas são as pendentes com vencimento anterior a hoje; próximas são as pendentes com vencimento em até 7 dias.
- A conta fixa tem no máximo um lançamento por mês, garantido por restrição única no banco.
- Alterar um lançamento de um mês não altera os meses anteriores; alterar a recorrência pode atualizar apenas pendentes do mês selecionado em diante (opcional no formulário).

## Publicação no GitHub Pages

### 1. Criar o repositório e enviar o código

```bash
git init -b main
git add .
git commit -m "Controle Financeiro"
git remote add origin https://github.com/SEU-USUARIO/controle-financeiro.git
git push -u origin main
```

### 2. Configurar os secrets

No repositório: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública |
| `VITE_SHARED_EMAIL` | E-mail do usuário compartilhado |

Opcionalmente, crie a **variable** `VITE_BASE_PATH`:

- Repositório de projeto (`https://usuario.github.io/controle-financeiro/`): deixe sem definir. O workflow usa `/<nome-do-repositorio>/` automaticamente.
- Repositório de usuário/organização (`https://usuario.github.io/`) ou domínio próprio: defina `VITE_BASE_PATH` como `/`.

### 3. Ativar o Pages

Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.

O workflow [`deploy.yml`](./.github/workflows/deploy.yml) roda a cada push na `main`:

1. instala as dependências com pnpm;
2. executa os testes;
3. gera o build com as variáveis do Supabase e o `base` correto;
4. publica o `dist` no Pages.

A URL final é:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

As rotas usam hash (`#/contas`, `#/relatorios`), então funcionam em subpastas e em recarregamentos sem configuração de servidor.

### Teste local com o mesmo `base` do Pages

PowerShell:

```powershell
$env:VITE_BASE_PATH="/controle-financeiro/"
pnpm build
pnpm preview
```

Linux/macOS:

```bash
VITE_BASE_PATH=/controle-financeiro/ pnpm build
pnpm preview
```

## Segurança

- A `anon key` é pública por definição e só permite o que o RLS autoriza.
- Todas as tabelas têm Row Level Security; o papel `anon` não acessa dados.
- O acesso é feito por **uma única conta compartilhada** (modelo pedido): quem tem a senha entra e vê os dados da família.
- O e-mail fixo fica embutido no bundle, mas nunca é exibido na interface.
- A senha não fica no código, no `.env` nem no GitHub; é digitada no login.
- Nenhuma função usa `security definer` para burlar RLS.
- A `service_role` não aparece no projeto.

## Testes

```bash
pnpm test
```

Cobrem:

- formatação e interpretação de valores em reais;
- aritmética de meses, vencimentos e fusos;
- somas de pago/pendente, projeção e classificação de vencidas/próximas;
- geração do PDF (estrutura e páginas).

O teste de integração com o Supabase real (login, RLS, CRUD, recorrências) deve ser feito com o projeto configurado, usando o checklist abaixo.

## Checklist de aceite

1. Login com senha incorreta e correta; e-mail nunca aparece.
2. Perfil selecionado; recarregar mantém; sair limpa a seleção.
3. Conta esporádica cadastrada aparece no mês correto.
4. Conta fixa aparece no mês atual e no seguinte, sem duplicar.
5. Editar um mês não altera o anterior.
6. Pausar, reativar e excluir recorrência conforme as regras.
7. Marcar e desmarcar pagamento, com data e totais corretos.
8. Atualizar saldo, consultar histórico e conferir a projeção.
9. Gráficos e PDF com os mesmos números da tela.
10. Renomear perfil/categoria reflete no sistema.
11. Duas abas/dispositivos recebem atualizações em tempo real.
12. Layout em 360 px, 768 px e desktop.
13. Build com `VITE_BASE_PATH` e acesso pela URL do Pages.
14. Requisição REST sem sessão não retorna dados.

## Problemas comuns

| Sintoma | Verifique |
|---|---|
| Tela de configuração pendente | `.env.local` com as três variáveis e novo build |
| Login falha | usuário confirmado, e-mail igual ao `VITE_SHARED_EMAIL` e senha correta |
| Dados não atualizam em outro aparelho | Realtime habilitado e tabelas na publicação `supabase_realtime` |
| PDF não gera | tela de relatórios carregada e navegador permitindo download |
| 404 no Pages | Pages configurado como GitHub Actions e build com o `base` correto |
| Categorias duplicadas | o seed só roda com a tabela vazia; ajuste manualmente |

## Limitações

- O sistema é estático (GitHub Pages): não há servidor próprio, cron ou envio de e-mail.
- Há um único login compartilhado; os “perfis” são uma identificação de quem lançou, não contas separadas.
- Sem receitas, investimentos, anexos, notificações ou orçamento por categoria (fora do escopo).
- A exclusão de dados é lógica; o histórico é preservado.
