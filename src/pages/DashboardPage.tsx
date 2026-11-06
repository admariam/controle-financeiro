import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CircleCheck,
  Clock,
  Landmark,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { MonthPicker } from '../components/layout/MonthPicker';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useDataRefresh } from '../data/DataRefreshProvider';
import { useMonth } from '../data/MonthProvider';
import { useBalance, useCategories, useMonthExpenses } from '../data/useData';
import {
  daysUntil,
  formatDate,
  formatDateTime,
  monthLabel,
} from '../lib/dates';
import { expenseTiming, projectedBalance, summarize } from '../lib/finance';
import { formatBRL } from '../lib/money';
import { cn } from '../lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const toneValueClasses: Record<Tone, string> = {
  neutral: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
  icon: LucideIcon;
}

function KpiCard({ label, value, hint, tone = 'neutral', icon: Icon }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p
        className={cn(
          'mt-2 text-lg font-semibold tracking-tight tabular-nums sm:text-xl',
          toneValueClasses[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{hint}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { month } = useMonth();
  const navigate = useNavigate();
  const { refresh } = useDataRefresh();

  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    reload: reloadExpenses,
  } = useMonthExpenses(month);
  const {
    data: balance,
    loading: balanceLoading,
    error: balanceError,
    reload: reloadBalance,
  } = useBalance();
  const { data: categories } = useCategories();

  const summary = useMemo(() => summarize(expenses), [expenses]);
  const projected = projectedBalance(balance.latest?.amount_cents ?? null, summary.pendingCents);

  const pending = useMemo(
    () =>
      expenses
        .filter((expense) => !expense.paid_at)
        .slice()
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [expenses],
  );

  const upcoming = pending.slice(0, 6);
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  const overdueValue = useMemo(
    () =>
      expenses
        .filter((expense) => expenseTiming(expense) === 'overdue')
        .reduce((total, expense) => total + expense.amount_cents, 0),
    [expenses],
  );

  const dueSoonValue = useMemo(
    () =>
      expenses
        .filter((expense) => expenseTiming(expense) === 'due-soon')
        .reduce((total, expense) => total + expense.amount_cents, 0),
    [expenses],
  );

  const hasError = Boolean(expensesError || balanceError);

  return (
    <>
      <PageHeader
        title="Início"
        description={`Resumo de ${monthLabel(month)}.`}
        actions={
          <>
            <MonthPicker />
            <Button onClick={refresh} variant="secondary" size="sm" className="hidden sm:inline-flex">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Atualizar
            </Button>
          </>
        }
      />

      {hasError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{expensesError ?? balanceError}</span>
          <button
            type="button"
            onClick={() => {
              reloadExpenses();
              reloadBalance();
            }}
            className="inline-flex items-center gap-1 font-medium hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Saldo disponível"
          value={balanceLoading && !balance.latest ? '—' : formatBRL(balance.latest?.amount_cents ?? null)}
          hint={
            balance.latest
              ? `Atualizado em ${formatDateTime(balance.latest.recorded_at)}`
              : 'Ainda não informado'
          }
          icon={Landmark}
          tone="neutral"
        />
        <KpiCard
          label="Contas pendentes"
          value={expensesLoading && expenses.length === 0 ? '—' : formatBRL(summary.pendingCents)}
          hint={`${summary.pendingCount} ${summary.pendingCount === 1 ? 'conta' : 'contas'} · ${summary.overdueCount} vencida(s)`}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label="Contas pagas"
          value={expensesLoading && expenses.length === 0 ? '—' : formatBRL(summary.paidCents)}
          hint={`${summary.paidCount} ${summary.paidCount === 1 ? 'conta paga' : 'contas pagas'} no mês`}
          icon={CircleCheck}
          tone="success"
        />
        <KpiCard
          label="Saldo projetado"
          value={
            projected === null
              ? '—'
              : expensesLoading && expenses.length === 0
                ? '—'
                : formatBRL(projected)
          }
          hint={projected === null ? 'Informe o saldo no Fluxo financeiro' : 'Após as contas pendentes'}
          icon={TrendingUp}
          tone={projected !== null && projected < 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Próximos vencimentos"
            description={monthLabel(month)}
            action={
              <Link
                to="/contas"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Ver contas
              </Link>
            }
          />

          {expensesLoading && expenses.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma conta neste mês"
                description="Cadastre as despesas do mês para acompanhar vencimentos e totais."
                action={
                  <Button onClick={() => navigate('/contas')}>
                    Cadastrar conta
                  </Button>
                }
              />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CircleCheck}
                title="Nenhuma conta pendente"
                description="Todas as contas deste mês já estão pagas."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((expense) => {
                const days = daysUntil(expense.due_date);
                const timing = expenseTiming(expense);
                const dueText =
                  days < 0
                    ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'} em atraso`
                    : days === 0
                      ? 'Vence hoje'
                      : `Em ${days} ${days === 1 ? 'dia' : 'dias'}`;

                return (
                  <li
                    key={expense.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60"
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        timing === 'overdue'
                          ? 'bg-red-500'
                          : timing === 'due-soon'
                            ? 'bg-amber-500'
                            : 'bg-slate-300',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{expense.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {categoryName.get(expense.category_id) ?? '—'} ·{' '}
                        <span
                          className={cn(
                            timing === 'overdue'
                              ? 'text-red-600'
                              : timing === 'due-soon'
                                ? 'text-amber-600'
                                : 'text-slate-500',
                          )}
                        >
                          {dueText} · {formatDate(expense.due_date)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums text-slate-900">
                        {formatBRL(expense.amount_cents)}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <Badge
                          tone={
                            timing === 'overdue'
                              ? 'danger'
                              : timing === 'due-soon'
                                ? 'warning'
                                : 'neutral'
                          }
                          dot
                        >
                          {timing === 'overdue' ? 'Vencida' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Situação do mês" />
          <div className="divide-y divide-slate-100 px-5">
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
                <span className="text-xs text-slate-600">Vencidas</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold tabular-nums text-slate-900">
                  {formatBRL(overdueValue)}
                </p>
                <p className="text-[10px] text-slate-400">{summary.overdueCount} conta(s)</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                <span className="text-xs text-slate-600">Próximas (7 dias)</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold tabular-nums text-slate-900">
                  {formatBRL(dueSoonValue)}
                </p>
                <p className="text-[10px] text-slate-400">{summary.dueSoonCount} conta(s)</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span className="text-xs text-slate-600">Pagas</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold tabular-nums text-slate-900">
                  {formatBRL(summary.paidCents)}
                </p>
                <p className="text-[10px] text-slate-400">{summary.paidCount} conta(s)</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-3">
            <Link
              to="/fluxo"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Ver fluxo financeiro
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
