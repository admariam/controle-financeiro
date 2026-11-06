import { describe, expect, it } from 'vitest';
import {
  addMonths,
  daysUntil,
  dueDateForDay,
  formatDate,
  monthLabel,
  monthsBack,
  parseMonthKey,
} from './dates';

describe('dates', () => {
  it('navega entre meses e anos', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-06', 6)).toBe('2026-12');
    expect(parseMonthKey('2026-11')).toEqual({ year: 2026, month: 11 });
  });

  it('limita o dia de vencimento ao último dia do mês', () => {
    expect(dueDateForDay('2026-02', 31)).toBe('2026-02-28');
    expect(dueDateForDay('2028-02', 31)).toBe('2028-02-29');
    expect(dueDateForDay('2026-04', 31)).toBe('2026-04-30');
    expect(dueDateForDay('2026-11', 10)).toBe('2026-11-10');
  });

  it('calcula dias de diferença sem deslocamento de fuso', () => {
    expect(daysUntil('2026-11-10', '2026-11-06')).toBe(4);
    expect(daysUntil('2026-11-01', '2026-11-06')).toBe(-5);
    expect(daysUntil('2026-11-06', '2026-11-06')).toBe(0);
  });

  it('formata e lista meses', () => {
    expect(formatDate('2026-11-06')).toBe('06/11/2026');
    expect(monthLabel('2026-03')).toBe('Março 2026');
    expect(monthsBack('2026-03', 3)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
