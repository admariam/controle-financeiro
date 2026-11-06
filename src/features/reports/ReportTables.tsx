import { formatDate, formatTimestampDate, monthLabel } from '../../lib/dates';
import { formatBRL } from '../../lib/money';
import type { Category, Expense, Profile } from '../../types/db';
import { ExpenseStatusBadge } from '../expenses/StatusBadge';

interface ExpenseReportTableProps {
  expenses: Expense[];
  categories: Category[];
  profiles: Profile[];
}

export function ExpenseReportTable({
  expenses,
  categories,
  profiles,
}: ExpenseReportTableProps) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const profileName = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Conta</th>
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 font-medium">Vencimento</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Perfil</th>
              <th className="px-3 py-3 font-medium">Situação</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="text-sm hover:bg-slate-50/60">
                <td className="px-5 py-3 font-medium text-slate-900">{expense.name}</td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {categoryName.get(expense.category_id) ?? '—'}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {formatDate(expense.due_date)}
                </td>
                <td className="hidden px-3 py-3 text-xs text-slate-600 lg:table-cell">
                  {profileName.get(expense.profile_id) ?? '—'}
                </td>
                <td className="px-3 py-3">
                  <ExpenseStatusBadge expense={expense} />
                  {expense.paid_at ? (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatTimestampDate(expense.paid_at)}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">
                  {formatBRL(expense.amount_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 sm:hidden">
        {expenses.map((expense) => (
          <div key={expense.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{expense.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {categoryName.get(expense.category_id) ?? '—'} ·{' '}
                  {profileName.get(expense.profile_id) ?? '—'}
                </p>
              </div>
              <ExpenseStatusBadge expense={expense} />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-[11px] text-slate-500">
                Vence em {formatDate(expense.due_date)}
                {expense.paid_at ? ` · paga em ${formatTimestampDate(expense.paid_at)}` : ''}
              </p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {formatBRL(expense.amount_cents)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export interface MonthlyHistoryRow {
  month: string;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
}

export function MonthlyHistoryTable({ rows }: { rows: MonthlyHistoryRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Mês</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="px-3 py-3 text-right font-medium">Pago</th>
              <th className="px-5 py-3 text-right font-medium">Pendente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.month} className="text-sm hover:bg-slate-50/60">
                <td className="px-5 py-3 font-medium text-slate-900">{monthLabel(row.month)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                  {formatBRL(row.totalCents)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                  {formatBRL(row.paidCents)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-amber-700">
                  {formatBRL(row.pendingCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 sm:hidden">
        {rows.map((row) => (
          <div key={row.month} className="px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{monthLabel(row.month)}</p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Pago <span className="text-emerald-700">{formatBRL(row.paidCents)}</span>
              </span>
              <span className="text-slate-500">
                Pendente <span className="text-amber-700">{formatBRL(row.pendingCents)}</span>
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Total</span>
              <span className="font-medium tabular-nums text-slate-900">
                {formatBRL(row.totalCents)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
