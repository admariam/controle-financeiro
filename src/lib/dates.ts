export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  return { year: Number(match[1]), month: Number(match[2]) };
}

export function isValidMonthKey(key: string | null | undefined): key is string {
  return typeof key === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

export function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function addMonths(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12 + 12) % 12 + 1;
  return `${nextYear}-${pad2(nextMonth)}`;
}

export function monthStart(key: string): string {
  return `${key}-01`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function lastDayOfMonth(key: string): number {
  const { year, month } = parseMonthKey(key);
  return daysInMonth(year, month);
}

export function dueDateForDay(key: string, day: number): string {
  const safeDay = Math.min(Math.max(1, Math.trunc(day)), lastDayOfMonth(key));
  return `${key}-${pad2(safeDay)}`;
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function monthShortLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_SHORT_NAMES[month - 1]}/${year}`;
}

export function todayISO(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** dd/MM/yyyy a partir de uma data sem horário (YYYY-MM-DD), sem deslocamento de fuso. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

export function formatTimestampDate(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return '—';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function utcDay(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Dias entre a data e hoje (positivo = futuro, negativo = passado). */
export function daysUntil(isoDate: string, fromISO: string = todayISO()): number {
  return Math.round((utcDay(isoDate) - utcDay(fromISO)) / 86_400_000);
}

export function monthsBack(endKey: string, count: number): string[] {
  const result: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    result.push(addMonths(endKey, -index));
  }
  return result;
}

export function monthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}
