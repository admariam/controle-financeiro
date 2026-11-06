import { useMemo, useState } from 'react';
import { Download, ReceiptText, RefreshCw } from 'lucide-react';
import { MonthPicker } from '../components/layout/MonthPicker';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { useProfile } from '../auth/ProfileProvider';
import { useMonth } from '../data/MonthProvider';
import { useBalance, useCategories, useMonthExpenses, useRangeExpenses } from '../data/useData';
import {
  CategoryChart,
  ComparisonChart,
  EvolutionChart,
  REPORT_COLORS,
  StatusChart,
  type CategorySlice,
  type MonthlyPoint,
} from '../features/reports/Charts';
import {
  ExpenseReportTable,
  MonthlyHistoryTable,
  type MonthlyHistoryRow,
} from '../features/reports/ReportTables';
import { addMonths, monthLabel, monthShortLabel, monthsBack } from '../lib/dates';
import { expenseTiming, summarize, totalsByCategory } from '../lib/finance';
import { formatBRL } from '../lib/money';
import { cn } from '../lib/cn';
import type { Expense } from '../types/db';

type ReportTab = 'expenses' | 'paid' | 'pending' | 'overdue' | 'history';

function shortMonth(key: string): string {
  const [name, year] = monthShortLabel(key).split('/');
  return `${name}/${year.slice(-2)}`;
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

export function ReportsPage() {
  const { month } = useMonth();
  const { profiles } = useProfile();
  const { showToast } = useToast();

  const rangeStart = addMonths(month, -11);

  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    reload: reloadExpenses,
  } = useMonthExpenses(month);
  const {
    data: rangeExpenses,
    loading: rangeLoading,
    error: rangeError,
    reload: reloadRange,
  } = useRangeExpenses(rangeStart, month);
  const {
    data: balance,
    loading: balanceLoading,
    error: balanceError,
    reload: reloadBalance,
  } = useBalance();
  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();

  const [tab, setTab] = useState<ReportTab>('expenses');
  const [exporting, setExporting] = useState(false);

  const summary = useMemo(() => summarize(expenses), [expenses]);

  const categoryData = useMemo<CategorySlice[]>(() => {
    const totals = totalsByCategory(expenses);

    return categories
      .map((category, index) => ({
        name: category.name,
        value: totals.get(category.id) ?? 0,
        color: REPORT_COLORS[index % REPORT_COLORS.length],
      }))
      .filter((slice) => slice.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories, expenses]);

  const monthTotals = useMemo(() => {
    const map = new Map<string, { total: number; paid: number }>();

    for (const expense of rangeExpenses) {
      const key = expense.reference_month.slice(0, 7);
      const current = map.get(key) ?? { total: 0, paid: 0 };
      current.total += expense.amount_cents;
      if (expense.paid_at) current.paid += expense.amount_cents;
      map.set(key, current);
    }

    return map;
  }, [rangeExpenses]);

  const evolutionData = useMemo<MonthlyPoint[]>(
    () =>
      monthsBack(month, 12).map((key) => ({
        label: shortMonth(key),
        total: monthTotals.get(key)?.total ?? 0,
        paid: monthTotals.get(key)?.paid ?? 0,
      })),
    [month, monthTotals],
  );

  const comparisonData = useMemo<MonthlyPoint[]>(
    () =>
      monthsBack(month, 6).map((key) => ({
        label: shortMonth(key),
        total: monthTotals.get(key)?.total ?? 0,
        paid: monthTotals.get(key)?.paid ?? 0,
      })),
    [month, monthTotals],
  );

  const historyRows = useMemo<MonthlyHistoryRow[]>(
    () =>
      monthsBack(month, 12)
        .slice()
        .reverse()
        .map((key) => {
          const totals = monthTotals.get(key) ?? { total: 0, paid: 0 };
          return {
            month: key,
            totalCents: totals.total,
            paidCents: totals.paid,
            pendingCents: totals.total - totals.paid,
          };
        }),
    [month, monthTotals],
  );

  const paidExpenses = useMemo(
    () => expenses.filter((expense) => expense.paid_at),
    [expenses],
  );
  const pendingExpenses = useMemo(
    () => expenses.filter((expense) => !expense.paid_at),
    [expenses],
  );
  const overdueExpenses = useMemo(
    () => expenses.filter((expense) => expenseTiming(expense) === 'overdue'),
    [expenses],
  );

  const tabs: Array<{ id: ReportTab; label: string; count: number | null }> = [
    { id: 'expenses', label: 'Despesas', count: expenses.length },
    { id: 'paid', label: 'Pagas', count: paidExpenses.length },
    { id: 'pending', label: 'Pendentes', count: pendingExpenses.length },
    { id: 'overdue', label: 'Vencidas', count: overdueExpenses.length },
    { id: 'history', label: 'Histórico', count: null },
  ];

  const tabExpenses: Expense[] =
    tab === 'paid'
      ? paidExpenses
      : tab === 'pending'
        ? pendingExpenses
        : tab === 'overdue'
          ? overdueExpenses
          : expenses;

  const anyError =
    expensesError ?? rangeError ?? balanceError ?? categoriesError ?? null;
  const currentLoading = expensesLoading && expenses.length === 0;
  const chartsLoading = rangeLoading && rangeExpenses.length === 0;
  const hasRangeData = rangeExpenses.length > 0;

  function retryAll() {
    reloadExpenses();
    reloadRange();
    reloadBalance();
    reloadCategories();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { buildMonthlyReportPdf } = await import('../lib/pdf');
      buildMonthlyReportPdf({
        month,
        balanceCents: balance.latest?.amount_cents ?? null,
        summary,
        expenses,
        categories,
      });
      showToast('PDF gerado.');
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível gerar o PDF.',
        'error',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        description={`Gráficos e demonstrativos de ${monthLabel(month)}.`}
        actions={
          <>
            <MonthPicker />
            <Button
              onClick={() => void handleExport()}
              loading={exporting}
              disabled={expensesLoading || balanceLoading || categoriesLoading}
            >
              <Download className="h-4 w-4" aria-hidden />
              Gerar PDF
            </Button>
          </>
        }
      />

      {anyError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{anyError}</span>
          <button
            type="button"
            onClick={retryAll}
            className="inline-flex items-center gap-1 font-medium hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Despesas por categoria"
            description={monthLabel(month)}
          />
          <div className="h-72 p-3">
            {currentLoading || (categoriesLoading && categories.length === 0) ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : categoryData.length === 0 ? (
              <ChartEmpty message="Sem despesas por categoria neste mês." />
            ) : (
              <CategoryChart data={categoryData} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Comparativo mensal"
            description="Total dos últimos 6 meses"
          />
          <div className="h-72 p-3">
            {chartsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : !hasRangeData ? (
              <ChartEmpty message="Sem despesas no período para comparar." />
            ) : (
              <ComparisonChart data={comparisonData} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pagas x pendentes"
            description={monthLabel(month)}
          />
          <div className="h-64 p-3">
            {currentLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : summary.totalCents === 0 ? (
              <ChartEmpty message="Sem contas no mês selecionado." />
            ) : (
              <StatusChart paidCents={summary.paidCents} pendingCents={summary.pendingCents} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Evolução dos gastos"
            description="Total e pago nos últimos 12 meses"
          />
          <div className="h-64 p-3">
            {chartsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : !hasRangeData ? (
              <ChartEmpty message="Sem histórico de gastos no período." />
            ) : (
              <EvolutionChart data={evolutionData} />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === item.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {item.label}
                {item.count !== null ? (
                  <span
                    className={cn(
                      'ml-1.5 text-[10px]',
                      tab === item.id ? 'text-slate-300' : 'text-slate-400',
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400">
            {tab === 'history'
              ? 'Últimos 12 meses'
              : tab === 'expenses'
                ? `${formatBRL(summary.totalCents)} no mês`
                : tab === 'paid'
                  ? `${formatBRL(summary.paidCents)} pagos`
                  : tab === 'pending'
                    ? `${formatBRL(summary.pendingCents)} pendentes`
                    : `${formatBRL(expenses.filter((item) => expenseTiming(item) === 'overdue').reduce((total, item) => total + item.amount_cents, 0))} vencidos`}
          </p>
        </div>

        {tab === 'history' ? (
          !hasRangeData ? (
            <div className="p-5">
              <EmptyState
                icon={ReceiptText}
                title="Sem histórico"
                description="Ainda não há lançamentos nos últimos 12 meses."
              />
            </div>
          ) : (
            <MonthlyHistoryTable rows={historyRows} />
          )
        ) : expensesLoading && expenses.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : tabExpenses.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ReceiptText}
              title={
                tab === 'paid'
                  ? 'Nenhuma conta paga'
                  : tab === 'pending'
                    ? 'Nenhuma conta pendente'
                    : tab === 'overdue'
                      ? 'Nenhuma conta vencida'
                      : 'Nenhuma despesa'
              }
              description={`Não há lançamentos para este filtro em ${monthLabel(month)}.`}
            />
          </div>
        ) : (
          <ExpenseReportTable
            expenses={tabExpenses}
            categories={categories}
            profiles={profiles}
          />
        )}
      </Card>
    </>
  );
}
