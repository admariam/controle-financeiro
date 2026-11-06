import { Pencil, Repeat2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  daysUntil,
  formatDate,
  formatTimestampDate,
} from '../../lib/dates';
import { formatBRL } from '../../lib/money';
import { cn } from '../../lib/cn';
import type { Category, Expense, Profile } from '../../types/db';
import { ExpenseStatusBadge } from './StatusBadge';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  profiles: Profile[];
  busyId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onTogglePaid: (expense: Expense) => void;
}

function dueHint(expense: Expense): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
  if (expense.paid_at) return null;

  const days = daysUntil(expense.due_date);
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      text: `${overdue} ${overdue === 1 ? 'dia' : 'dias'} em atraso`,
      tone: 'danger',
    };
  }
  if (days === 0) return { text: 'Vence hoje', tone: 'warning' };
  if (days <= 7) {
    return { text: `Em ${days} ${days === 1 ? 'dia' : 'dias'}`, tone: 'warning' };
  }
  return null;
}

export function ExpenseList({
  expenses,
  categories,
  profiles,
  busyId,
  onEdit,
  onDelete,
  onTogglePaid,
}: ExpenseListProps) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const profileName = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="w-12 px-4 py-3 font-medium">Pago</th>
              <th className="px-3 py-3 font-medium">Conta</th>
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 font-medium">Vencimento</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Perfil</th>
              <th className="px-3 py-3 text-right font-medium">Valor</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="w-24 px-3 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const hint = dueHint(expense);
              const busy = busyId === expense.id;

              return (
                <tr
                  key={expense.id}
                  className={cn(
                    'text-sm transition-colors hover:bg-slate-50/70',
                    hint?.tone === 'danger' && 'bg-red-50/30',
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={Boolean(expense.paid_at)}
                      onChange={() => onTogglePaid(expense)}
                      disabled={busy}
                      aria-label={
                        expense.paid_at
                          ? `Desmarcar pagamento de ${expense.name}`
                          : `Marcar ${expense.name} como paga`
                      }
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:opacity-50"
                    />
                  </td>

                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-900">{expense.name}</span>
                      {expense.type === 'fixed' ? (
                        <Repeat2
                          className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          aria-label="Conta fixa"
                        />
                      ) : null}
                    </div>
                    {expense.notes ? (
                      <p className="mt-0.5 max-w-[260px] truncate text-[11px] text-slate-400">
                        {expense.notes}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 align-top text-xs text-slate-600">
                    {categoryName.get(expense.category_id) ?? '—'}
                  </td>

                  <td className="px-3 py-3 align-top">
                    <p className="text-xs text-slate-700">{formatDate(expense.due_date)}</p>
                    {hint ? (
                      <p
                        className={cn(
                          'mt-0.5 text-[11px]',
                          hint.tone === 'danger' ? 'text-red-600' : 'text-amber-600',
                        )}
                      >
                        {hint.text}
                      </p>
                    ) : null}
                  </td>

                  <td className="hidden px-3 py-3 align-top text-xs text-slate-600 lg:table-cell">
                    {profileName.get(expense.profile_id) ?? '—'}
                  </td>

                  <td className="px-3 py-3 text-right align-top font-medium tabular-nums text-slate-900">
                    {formatBRL(expense.amount_cents)}
                  </td>

                  <td className="px-3 py-3 align-top">
                    <ExpenseStatusBadge expense={expense} />
                    {expense.paid_at ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatTimestampDate(expense.paid_at)}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 text-right align-top">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(expense)}
                        disabled={busy}
                        aria-label={`Editar ${expense.name}`}
                        title="Editar este mês"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(expense)}
                        disabled={busy}
                        aria-label={`Excluir ${expense.name}`}
                        title="Excluir"
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {expenses.map((expense) => {
          const hint = dueHint(expense);
          const busy = busyId === expense.id;

          return (
            <div
              key={expense.id}
              className={cn(
                'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
                hint?.tone === 'danger' && 'border-red-200 bg-red-50/20',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-slate-900">{expense.name}</p>
                    {expense.type === 'fixed' ? (
                      <Repeat2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Conta fixa" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {categoryName.get(expense.category_id) ?? '—'} ·{' '}
                    {profileName.get(expense.profile_id) ?? '—'}
                  </p>
                </div>
                <ExpenseStatusBadge expense={expense} />
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-500">
                    Vence em {formatDate(expense.due_date)}
                  </p>
                  {hint ? (
                    <p
                      className={cn(
                        'text-[11px]',
                        hint.tone === 'danger' ? 'text-red-600' : 'text-amber-600',
                      )}
                    >
                      {hint.text}
                    </p>
                  ) : expense.paid_at ? (
                    <p className="text-[11px] text-slate-400">
                      Paga em {formatTimestampDate(expense.paid_at)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {formatBRL(expense.amount_cents)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <label className="mr-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={Boolean(expense.paid_at)}
                      onChange={() => onTogglePaid(expense)}
                      disabled={busy}
                      aria-label={
                        expense.paid_at
                          ? `Desmarcar pagamento de ${expense.name}`
                          : `Marcar ${expense.name} como paga`
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:opacity-50"
                    />
                    Paga
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(expense)}
                    disabled={busy}
                    aria-label={`Editar ${expense.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(expense)}
                    disabled={busy}
                    aria-label={`Excluir ${expense.name}`}
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
