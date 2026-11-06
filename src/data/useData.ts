import { useCallback, useEffect, useRef, useState } from 'react';
import type { BankBalance, Category, Expense, ExpenseRecurrence } from '../types/db';
import { addMonths } from '../lib/dates';
import {
  generateRecurringExpenses,
  latestBankBalance,
  listBankBalanceHistory,
  listCategories,
  listExpensesForMonth,
  listExpensesInRange,
  listRecurrences,
} from './api';
import { useDataRefresh } from './DataRefreshProvider';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useAsyncData<T>(
  loader: () => Promise<T>,
  initialValue: T,
  dependencyList: unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar os dados.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // A lista de dependências é controlada por quem chama o hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencyList, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return { data, loading, error, reload };
}

export function useCategories() {
  const { version } = useDataRefresh();
  return useAsyncData<Category[]>(listCategories, [], [version]);
}

export function useMonthExpenses(month: string) {
  const { version } = useDataRefresh();
  const result = useAsyncData<Expense[]>(
    async () => {
      try {
        await generateRecurringExpenses(
          addMonths(month, -11),
          addMonths(month, 1),
        );
      } catch (caught) {
        // A listagem continua mesmo se a geração automática falhar.
        console.warn('Não foi possível gerar as contas fixas.', caught);
      }

      return listExpensesForMonth(month);
    },
    [],
    [month, version],
  );
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!result.loading && !result.error) setLoadedMonth(month);
  }, [month, result.loading, result.error]);

  return {
    ...result,
    data: loadedMonth === month ? result.data : [],
  };
}

export function useRecurrences() {
  const { version } = useDataRefresh();
  return useAsyncData<ExpenseRecurrence[]>(listRecurrences, [], [version]);
}

export interface BalanceState {
  latest: BankBalance | null;
  history: BankBalance[];
}

export function useBalance() {
  const { version } = useDataRefresh();

  return useAsyncData<BalanceState>(
    async () => {
      const [latest, history] = await Promise.all([
        latestBankBalance(),
        listBankBalanceHistory(),
      ]);
      return { latest, history };
    },
    { latest: null, history: [] },
    [version],
  );
}

export function useRangeExpenses(startMonth: string, endMonth: string) {
  const { version } = useDataRefresh();
  const result = useAsyncData<Expense[]>(
    async () => {
      try {
        await generateRecurringExpenses(startMonth, endMonth);
      } catch (caught) {
        console.warn('Não foi possível gerar as contas fixas do período.', caught);
      }

      return listExpensesInRange(startMonth, endMonth);
    },
    [],
    [startMonth, endMonth, version],
  );
  const rangeKey = `${startMonth}:${endMonth}`;
  const [loadedRange, setLoadedRange] = useState<string | null>(null);

  useEffect(() => {
    if (!result.loading && !result.error) setLoadedRange(rangeKey);
  }, [rangeKey, result.loading, result.error]);

  return {
    ...result,
    data: loadedRange === rangeKey ? result.data : [],
  };
}
