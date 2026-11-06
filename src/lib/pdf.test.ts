import { describe, expect, it } from 'vitest';
import type { Category, Expense } from '../types/db';
import { createMonthlyReportPdf } from './pdf';

const categories: Category[] = [
  {
    id: 'c1',
    name: 'Moradia',
    sort_order: 1,
    is_active: true,
    created_by: 'u',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Alimentação',
    sort_order: 2,
    is_active: true,
    created_by: 'u',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const expenses: Expense[] = [
  {
    id: 'e1',
    recurrence_id: null,
    name: 'Aluguel',
    category_id: 'c1',
    amount_cents: 180000,
    due_date: '2026-11-05',
    reference_month: '2026-11-01',
    type: 'fixed',
    notes: null,
    paid_at: '2026-11-05T12:00:00Z',
    status: 'paid',
    profile_id: 'p1',
    created_by: 'u',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-05T12:00:00Z',
    deleted_at: null,
  },
  {
    id: 'e2',
    recurrence_id: null,
    name: 'Mercado',
    category_id: 'c2',
    amount_cents: 45000,
    due_date: '2026-11-20',
    reference_month: '2026-11-01',
    type: 'episodic',
    notes: null,
    paid_at: null,
    status: 'pending',
    profile_id: 'p2',
    created_by: 'u',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    deleted_at: null,
  },
];

describe('pdf', () => {
  it('gera um PDF válido com indicadores, gráfico e tabela', () => {
    const doc = createMonthlyReportPdf({
      month: '2026-11',
      balanceCents: 300000,
      summary: {
        totalCents: 225000,
        paidCents: 180000,
        pendingCents: 45000,
        paidCount: 1,
        pendingCount: 1,
        overdueCount: 0,
        dueSoonCount: 0,
      },
      expenses,
      categories,
    });

    const buffer = doc.output('arraybuffer');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  });

  it('pagina a tabela quando há muitos lançamentos', () => {
    const many = Array.from({ length: 70 }, (_, index) => ({
      ...expenses[1],
      id: `many-${index}`,
      name: `Conta ${index + 1}`,
      amount_cents: 10_000 + index,
    }));

    const doc = createMonthlyReportPdf({
      month: '2026-11',
      balanceCents: 300000,
      summary: {
        totalCents: 700_000,
        paidCents: 0,
        pendingCents: 700_000,
        paidCount: 0,
        pendingCount: 70,
        overdueCount: 0,
        dueSoonCount: 0,
      },
      expenses: many,
      categories,
    });

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});
