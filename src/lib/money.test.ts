import { describe, expect, it } from 'vitest';
import {
  centsToInput,
  formatBRL,
  formatBRLCompact,
  parseAmountToCents,
} from './money';

describe('money', () => {
  it('formata centavos em reais', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(1)).toBe('R$ 0,01');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(null)).toBe('—');
  });

  it('formata valores compactos', () => {
    expect(formatBRLCompact(123456)).toBe('R$ 1,2 mil');
    expect(formatBRLCompact(50000)).toBe('R$ 500');
  });

  it('interpreta formatos brasileiros e internacionais', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('1234,56')).toBe(123456);
    expect(parseAmountToCents('1234.56')).toBe(123456);
    expect(parseAmountToCents('R$ 2.500,00')).toBe(250000);
    expect(parseAmountToCents('1.234')).toBe(123400);
    expect(parseAmountToCents('0,01')).toBe(1);
  });

  it('rejeita entradas inválidas', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('1,234')).toBeNull();
    expect(parseAmountToCents('10,00,00')).toBeNull();
  });

  it('converte centavos para o campo de edição', () => {
    expect(centsToInput(123456)).toBe('1234,56');
    expect(centsToInput(5)).toBe('0,05');
  });
});
