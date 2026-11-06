import { describe, expect, it } from 'vitest';
import type { Expense } from '../types/db';
import { expenseTiming, projectedBalance, summarize } from './finance';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    recurrence_id: null,
    name: 'Conta',
    category_id: 'categoria',
    amount_cents: 10000,
    due_date: '2026-11-10',
    reference_month: '2026-11-01',
    type: 'episodic',
    notes: null,
    paid_at: null,
    status: 'pending',
    profile_id: 'perfil',
    created_by: 'usuario',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('finance', () => {
  const today = '2026-11-06';

  it('classifica pago, vencido, próximo e pendente', () => {
    expect(
      expenseTiming(makeExpense({ paid_at: '2026-11-02T12:00:00Z' }), today),
    ).toBe('paid');
    expect(expenseTiming(makeExpense({ due_date: '2026-11-05' }), today)).toBe('overdue');
    expect(expenseTiming(makeExpense({ due_date: '2026-11-06' }), today)).toBe('due-soon');
    expect(expenseTiming(makeExpense({ due_date: '2026-11-13' }), today)).toBe('due-soon');
    expect(expenseTiming(makeExpense({ due_date: '2026-11-14' }), today)).toBe('pending');
  });

  it('soma pago e pendente sem contar duas vezes', () => {
    const summary = summarize(
      [
        makeExpense({
          amount_cents: 10000,
          paid_at: '2026-11-02T12:00:00Z',
        }),
        makeExpense({ amount_cents: 25000, due_date: '2026-11-05' }),
        makeExpense({ amount_cents: 30000, due_date: '2026-11-20' }),
      ],
      today,
    );

    expect(summary.totalCents).toBe(65000);
    expect(summary.paidCents).toBe(10000);
    expect(summary.pendingCents).toBe(55000);
    expect(summary.paidCount).toBe(1);
    expect(summary.pendingCount).toBe(2);
    expect(summary.overdueCount).toBe(1);
    expect(summary.dueSoonCount).toBe(0);
  });

  it('calcula o saldo projetado descontando apenas pendentes', () => {
    expect(projectedBalance(100000, 55000)).toBe(45000);
    expect(projectedBalance(null, 55000)).toBeNull();
  });

  it('ignora lançamentos excluídos', () => {
    const summary = summarize(
      [
        makeExpense({ amount_cents: 10000 }),
        makeExpense({
          amount_cents: 5000,
          deleted_at: '2026-11-02T12:00:00Z',
        }),
      ],
      today,
    );

    expect(summary.totalCents).toBe(10000);
  });
});
