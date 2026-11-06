import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonth } from '../../data/MonthProvider';
import { MONTH_NAMES, pad2, parseMonthKey } from '../../lib/dates';
import { cn } from '../../lib/cn';

export function MonthPicker({ className }: { className?: string }) {
  const { month, setMonth, shiftMonth } = useMonth();
  const { year, month: monthNumber } = parseMonthKey(month);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const min = Math.min(year, currentYear - 4);
    const max = Math.max(year, currentYear + 4);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [year]);

  return (
    <div
      className={cn(
        'inline-flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-xs',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        aria-label="Mês anterior"
        className="flex h-8 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      <select
        aria-label="Mês"
        value={monthNumber}
        onChange={(event) => setMonth(`${year}-${pad2(Number(event.target.value))}`)}
        className="h-8 cursor-pointer rounded-md border-0 bg-transparent pl-1 pr-6 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>

      <select
        aria-label="Ano"
        value={year}
        onChange={(event) => setMonth(`${event.target.value}-${pad2(monthNumber)}`)}
        className="h-8 cursor-pointer rounded-md border-0 bg-transparent pl-1 pr-5 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        {years.map((optionYear) => (
          <option key={optionYear} value={optionYear}>
            {optionYear}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => shiftMonth(1)}
        aria-label="Próximo mês"
        className="flex h-8 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
