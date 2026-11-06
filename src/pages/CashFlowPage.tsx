import { useMemo, useState } from 'react';
import { Info, RefreshCw, Wallet } from 'lucide-react';
import { MonthPicker } from '../components/layout/MonthPicker';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useProfile } from '../auth/ProfileProvider';
import { useDataRefresh } from '../data/DataRefreshProvider';
import { useMonth } from '../data/MonthProvider';
import { useBalance, useMonthExpenses } from '../data/useData';
import { BalanceModal } from '../features/cashflow/BalanceModal';
import { formatDateTime, monthLabel } from '../lib/dates';
import { projectedBalance, summarize } from '../lib/finance';
import { formatBRL } from '../lib/money';
import { cn } from '../lib/cn';

export function CashFlowPage() {
  const { month } = useMonth();
  const { profile, profiles } = useProfile();
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

  const [modalOpen, setModalOpen] = useState(false);

  const summary = useMemo(() => summarize(expenses), [expenses]);
  const projected = projectedBalance(
    balance.latest?.amount_cents ?? null,
    summary.pendingCents,
  );
  const profileName = new Map(profiles.map((item) => [item.id, item.name]));

  const history = balance.history;
  const hasError = Boolean(expensesError || balanceError);

  return (
    <>
      <PageHeader
        title="Fluxo financeiro"
        description={`Saldo bancário e projeção de ${monthLabel(month)}.`}
        actions={
          <>
            <MonthPicker />
            <Button onClick={() => setModalOpen(true)} disabled={!profile}>
              {balance.latest ? 'Atualizar saldo' : 'Informar saldo'}
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

      <Card className="border-l-4 border-l-emerald-600 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Saldo disponível
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-4xl">
              {balanceLoading && !balance.latest
                ? '—'
                : formatBRL(balance.latest?.amount_cents ?? null)}
            </p>
            {balance.latest ? (
              <p className="mt-2 text-xs text-slate-500">
                Atualizado em {formatDateTime(balance.latest.recorded_at)} por{' '}
                {profileName.get(balance.latest.profile_id) ?? 'perfil removido'}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Informe o saldo para calcular o valor projetado do mês.
              </p>
            )}
          </div>

          <Button variant="secondary" onClick={() => setModalOpen(true)} disabled={!profile}>
            <Wallet className="h-4 w-4" aria-hidden />
            {balance.latest ? 'Registrar novo saldo' : 'Informar saldo'}
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Contas pendentes</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-amber-700 sm:text-xl">
            {expensesLoading && expenses.length === 0 ? '—' : formatBRL(summary.pendingCents)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {summary.pendingCount} conta(s) · {summary.overdueCount} vencida(s)
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Contas pagas</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-emerald-700 sm:text-xl">
            {expensesLoading && expenses.length === 0 ? '—' : formatBRL(summary.paidCents)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{summary.paidCount} conta(s) paga(s)</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Saldo projetado</p>
          <p
            className={cn(
              'mt-1.5 text-lg font-semibold tabular-nums sm:text-xl',
              projected === null
                ? 'text-slate-400'
                : projected < 0
                  ? 'text-red-700'
                  : 'text-emerald-700',
            )}
          >
            {projected === null ? '—' : formatBRL(projected)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Após as contas pendentes do mês</p>
        </Card>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <p>
          Saldo projetado = saldo disponível − contas pendentes do mês. Contas já pagas não são
          descontadas novamente, pois o saldo informado já considera essas saídas.
        </p>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Histórico de saldos"
          description="Cada atualização fica registrada com data e hora."
        />

        {balanceLoading && history.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : history.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Wallet}
              title="Nenhum saldo informado"
              description="O primeiro saldo registrado aparecerá aqui."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Data e hora</th>
                    <th className="px-3 py-3 font-medium">Perfil</th>
                    <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((entry, index) => (
                    <tr key={entry.id} className="text-sm hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{formatDateTime(entry.recorded_at)}</span>
                          {index === 0 ? (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                              Atual
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {profileName.get(entry.profile_id) ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                        {formatBRL(entry.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 sm:hidden">
              {history.map((entry, index) => (
                <div key={entry.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium tabular-nums text-slate-900">
                      {formatBRL(entry.amount_cents)}
                    </p>
                    {index === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Atual
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatDateTime(entry.recorded_at)} ·{' '}
                    {profileName.get(entry.profile_id) ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <BalanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        latest={balance.latest}
        profileId={profile?.id ?? ''}
        onSaved={refresh}
      />
    </>
  );
}
