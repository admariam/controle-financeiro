import { useMemo, useState } from 'react';
import { Plus, ReceiptText, RefreshCw, Repeat2 } from 'lucide-react';
import { MonthPicker } from '../components/layout/MonthPicker';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { useProfile } from '../auth/ProfileProvider';
import {
  deleteRecurrenceRecord,
  setExpensePaid,
  setRecurrenceActive,
  softDeleteExpense,
} from '../data/api';
import { useDataRefresh } from '../data/DataRefreshProvider';
import { useMonth } from '../data/MonthProvider';
import { useCategories, useMonthExpenses, useRecurrences } from '../data/useData';
import { ExpenseFormModal } from '../features/expenses/ExpenseFormModal';
import { ExpenseList } from '../features/expenses/ExpenseList';
import { RecurrenceFormModal } from '../features/expenses/RecurrenceFormModal';
import { RecurrenceList } from '../features/expenses/RecurrenceList';
import { expenseTiming, summarize } from '../lib/finance';
import { formatDate, monthLabel, todayISO } from '../lib/dates';
import { formatBRL } from '../lib/money';
import { cn } from '../lib/cn';
import type { Expense, ExpenseRecurrence, ExpenseType } from '../types/db';

type Tab = 'expenses' | 'recurrences';
type Filter = 'all' | 'pending' | 'paid' | 'overdue';

interface FormState {
  expense: Expense | null;
  type: ExpenseType;
}

export function ExpensesPage() {
  const { month } = useMonth();
  const { profile, profiles } = useProfile();
  const { refresh } = useDataRefresh();
  const { showToast } = useToast();

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();
  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    reload: reloadExpenses,
  } = useMonthExpenses(month);
  const {
    data: recurrences,
    loading: recurrencesLoading,
    error: recurrencesError,
    reload: reloadRecurrences,
  } = useRecurrences();

  const [tab, setTab] = useState<Tab>('expenses');
  const [filter, setFilter] = useState<Filter>('all');
  const [formState, setFormState] = useState<FormState | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState<ExpenseRecurrence | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [recurrenceToDelete, setRecurrenceToDelete] = useState<ExpenseRecurrence | null>(null);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);
  const [busyRecurrenceId, setBusyRecurrenceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const summary = useMemo(() => summarize(expenses), [expenses]);

  const counts = useMemo(
    () => ({
      all: expenses.length,
      pending: expenses.filter((expense) => !expense.paid_at).length,
      paid: expenses.filter((expense) => expense.paid_at).length,
      overdue: expenses.filter((expense) => expenseTiming(expense) === 'overdue').length,
    }),
    [expenses],
  );

  const filteredExpenses = useMemo(() => {
    switch (filter) {
      case 'paid':
        return expenses.filter((expense) => expense.paid_at);
      case 'pending':
        return expenses.filter((expense) => !expense.paid_at);
      case 'overdue':
        return expenses.filter((expense) => expenseTiming(expense) === 'overdue');
      default:
        return expenses;
    }
  }, [expenses, filter]);

  const filterOptions: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'pending', label: 'Pendentes', count: counts.pending },
    { id: 'paid', label: 'Pagas', count: counts.paid },
    { id: 'overdue', label: 'Vencidas', count: counts.overdue },
  ];

  const canCreate = !categoriesLoading && categories.length > 0 && profiles.length > 0;

  function openCreate(type: ExpenseType) {
    setFormState({ expense: null, type });
  }

  async function handleTogglePaid(expense: Expense) {
    const willPay = !expense.paid_at;
    setBusyExpenseId(expense.id);

    try {
      await setExpensePaid(expense.id, willPay);
      refresh();
      showToast(
        willPay
          ? `Pagamento registrado em ${formatDate(todayISO())}.`
          : 'Pagamento desfeito.',
      );
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível atualizar o pagamento.',
        'error',
      );
    } finally {
      setBusyExpenseId(null);
    }
  }

  async function handleDeleteExpense() {
    if (!expenseToDelete) return;
    setDeleting(true);

    try {
      await softDeleteExpense(expenseToDelete.id);
      refresh();
      showToast('Lançamento excluído.');
      setExpenseToDelete(null);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível excluir o lançamento.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleRecurrence(recurrence: ExpenseRecurrence) {
    setBusyRecurrenceId(recurrence.id);

    try {
      await setRecurrenceActive(recurrence.id, !recurrence.is_active);
      refresh();
      showToast(recurrence.is_active ? 'Recorrência pausada.' : 'Recorrência reativada.');
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível atualizar a recorrência.',
        'error',
      );
    } finally {
      setBusyRecurrenceId(null);
    }
  }

  async function handleDeleteRecurrence() {
    if (!recurrenceToDelete) return;
    setDeleting(true);

    try {
      await deleteRecurrenceRecord(recurrenceToDelete.id, month);
      refresh();
      showToast('Recorrência excluída.');
      setRecurrenceToDelete(null);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível excluir a recorrência.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Contas"
        description="Lançamentos e recorrências do mês selecionado."
        actions={
          <>
            <MonthPicker />
            <Button onClick={() => openCreate(tab === 'recurrences' ? 'fixed' : 'episodic')} disabled={!canCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {tab === 'recurrences' ? 'Nova conta fixa' : 'Nova conta'}
            </Button>
          </>
        }
      />

      <Card className="mb-4 grid grid-cols-3 divide-x divide-slate-100">
        <div className="px-4 py-3">
          <p className="text-[11px] text-slate-500">Total do mês</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
            {formatBRL(summary.totalCents)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] text-slate-500">Pago</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-700 sm:text-lg">
            {formatBRL(summary.paidCents)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] text-slate-500">Pendente</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-amber-700 sm:text-lg">
            {formatBRL(summary.pendingCents)}
          </p>
        </div>
      </Card>

      {categoriesError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>Não foi possível carregar as categorias: {categoriesError}</span>
          <button
            type="button"
            onClick={() => void reloadCategories()}
            className="inline-flex items-center gap-1 font-medium hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex gap-5 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('expenses')}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors',
            tab === 'expenses'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          Lançamentos
          <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">
            {expenses.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('recurrences')}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors',
            tab === 'recurrences'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          Recorrências
          <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">
            {recurrences.length}
          </span>
        </button>
      </div>

      {tab === 'expenses' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === option.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {option.label}
                <span
                  className={cn(
                    'ml-1.5 text-[10px]',
                    filter === option.id ? 'text-slate-300' : 'text-slate-400',
                  )}
                >
                  {option.count}
                </span>
              </button>
            ))}
            <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">
              {filteredExpenses.length} de {expenses.length} lançamentos
            </span>
          </div>

          {expensesLoading && expenses.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Spinner />
            </div>
          ) : expensesError && expenses.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-red-600">{expensesError}</p>
              <Button variant="secondary" className="mt-3" onClick={() => void reloadExpenses()}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Tentar novamente
              </Button>
            </Card>
          ) : expenses.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={ReceiptText}
                title="Nenhuma conta neste mês"
                description="Cadastre uma despesa avulsa ou uma conta fixa para começar."
                action={
                  <Button onClick={() => openCreate('episodic')} disabled={!canCreate}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Nova conta
                  </Button>
                }
              />
            </Card>
          ) : filteredExpenses.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={ReceiptText}
                title="Nenhuma conta com este filtro"
                description={`Não há lançamentos com o filtro selecionado em ${monthLabel(month)}.`}
              />
            </Card>
          ) : (
            <ExpenseList
              expenses={filteredExpenses}
              categories={categories}
              profiles={profiles}
              busyId={busyExpenseId}
              onEdit={(expense) => setFormState({ expense, type: expense.type })}
              onDelete={setExpenseToDelete}
              onTogglePaid={handleTogglePaid}
            />
          )}
        </>
      ) : (
        <>
          {recurrencesLoading && recurrences.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Spinner />
            </div>
          ) : recurrencesError && recurrences.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-red-600">{recurrencesError}</p>
              <Button variant="secondary" className="mt-3" onClick={() => void reloadRecurrences()}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Tentar novamente
              </Button>
            </Card>
          ) : recurrences.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={Repeat2}
                title="Nenhuma conta fixa"
                description="Contas fixas são cadastradas uma vez e repetidas automaticamente nos meses seguintes."
                action={
                  <Button onClick={() => openCreate('fixed')} disabled={!canCreate}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Nova conta fixa
                  </Button>
                }
              />
            </Card>
          ) : (
            <RecurrenceList
              recurrences={recurrences}
              categories={categories}
              profiles={profiles}
              busyId={busyRecurrenceId}
              onEdit={setEditingRecurrence}
              onToggleActive={handleToggleRecurrence}
              onDelete={setRecurrenceToDelete}
            />
          )}
        </>
      )}

      <ExpenseFormModal
        open={formState !== null}
        onClose={() => setFormState(null)}
        month={month}
        categories={categories}
        profiles={profiles}
        currentProfileId={profile?.id ?? ''}
        initialType={formState?.type ?? 'episodic'}
        expense={formState?.expense ?? null}
        onSaved={refresh}
      />

      <RecurrenceFormModal
        open={editingRecurrence !== null}
        onClose={() => setEditingRecurrence(null)}
        recurrence={editingRecurrence}
        month={month}
        categories={categories}
        profiles={profiles}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={expenseToDelete !== null}
        title="Excluir lançamento?"
        description={
          <>
            O lançamento <strong>{expenseToDelete?.name}</strong> de{' '}
            {expenseToDelete ? formatDate(expenseToDelete.due_date) : ''} será removido de{' '}
            {monthLabel(month)}. Se for uma conta fixa, ela não será recriada neste mês. Esta ação
            não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => void handleDeleteExpense()}
        onClose={() => {
          if (!deleting) setExpenseToDelete(null);
        }}
      />

      <ConfirmDialog
        open={recurrenceToDelete !== null}
        title="Excluir recorrência?"
        description={
          <>
            A recorrência <strong>{recurrenceToDelete?.name}</strong> será encerrada. Os lançamentos
            não pagos a partir de {monthLabel(month)} serão removidos. Contas pagas e meses anteriores
            são preservados.
          </>
        }
        confirmLabel="Excluir recorrência"
        loading={deleting}
        onConfirm={() => void handleDeleteRecurrence()}
        onClose={() => {
          if (!deleting) setRecurrenceToDelete(null);
        }}
      />
    </>
  );
}
