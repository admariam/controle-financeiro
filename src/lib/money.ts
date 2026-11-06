const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata centavos como R$ 1.234,56. */
export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  return brlFormatter.format(cents / 100).replace(/\u00a0/g, ' ');
}

/** Formato curto para eixos de gráficos: R$ 1,2 mil. */
export function formatBRLCompact(cents: number): string {
  const reais = cents / 100;
  const abs = Math.abs(reais);

  if (abs >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} mi`;
  }

  if (abs >= 1_000) {
    return `R$ ${(reais / 1_000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} mil`;
  }

  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/**
 * Converte texto digitado em reais para centavos.
 * Aceita "1.234,56", "1234,56", "1234.56" e "R$ 1.234,56".
 * Retorna null para entrada inválida.
 */
export function parseAmountToCents(raw: string): number | null {
  let text = raw.trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!text) return null;

  const negative = text.startsWith('-');
  text = text.replace(/-/g, '');

  if (!/^[\d.,]+$/.test(text)) return null;

  let normalized: string;

  if (text.includes(',')) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = text.split('.');
    if (parts.length === 1) {
      normalized = text;
    } else if (parts.length === 2) {
      normalized = parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : parts.join('');
    } else {
      normalized = text.replace(/\./g, '');
    }
  }

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value > 999_999_999.99) return null;

  return Math.round(value * 100) * (negative ? -1 : 1);
}

/** Centavos para o formato de edição "1234,56". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function centsToNumberInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value), 0);
}
