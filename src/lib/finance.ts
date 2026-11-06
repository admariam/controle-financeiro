import type { Expense } from '../types/db';
import { daysUntil, todayISO } from './dates';

export type ExpenseTiming = 'paid' | 'overdue' | 'due-soon' | 'pending';

/** Classifica um lançamento para exibição. */
export function expenseTiming(expense: Expense, fromISO: string = todayISO()): ExpenseTiming {
  if (expense.paid_at) return 'paid';

  const days = daysUntil(expense.due_date, fromISO);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due-soon';
  return 'pending';
}

export interface MonthSummary {
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

/** Soma os lançamentos do mês em centavos inteiros. */
export function summarize(expenses: Expense[], fromISO: string = todayISO()): MonthSummary {
  const visible = expenses.filter((expense) => !expense.deleted_at);
  let totalCents = 0;
  let paidCents = 0;
  let pendingCents = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;

  for (const expense of visible) {
    const amount = Math.round(expense.amount_cents);
    totalCents += amount;

    if (expense.paid_at) {
      paidCents += amount;
      paidCount += 1;
      continue;
    }

    pendingCents += amount;
    pendingCount += 1;

    const timing = expenseTiming(expense, fromISO);
    if (timing === 'overdue') overdueCount += 1;
    if (timing === 'due-soon') dueSoonCount += 1;
  }

  return {
    totalCents,
    paidCents,
    pendingCents,
    paidCount,
    pendingCount,
    overdueCount,
    dueSoonCount,
  };
}

/**
 * Saldo projetado = saldo disponível − contas pendentes.
 * Contas pagas não são descontadas de novo.
 */
export function projectedBalance(
  balanceCents: number | null,
  pendingCents: number,
): number | null {
  if (balanceCents === null) return null;
  return balanceCents - pendingCents;
}

/** Agrupa os lançamentos visíveis por categoria. */
export function totalsByCategory(expenses: Expense[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.deleted_at) continue;
    totals.set(
      expense.category_id,
      (totals.get(expense.category_id) ?? 0) + Math.round(expense.amount_cents),
    );
  }

  return totals;
}
