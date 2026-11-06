import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { addMonths, currentMonthKey, isValidMonthKey } from '../lib/dates';

const STORAGE_KEY = 'controle-financeiro:mes';

interface MonthContextValue {
  month: string;
  setMonth: (month: string) => void;
  shiftMonth: (delta: number) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

function readInitialMonth(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidMonthKey(stored)) return stored;
  } catch {
    // Armazenamento indisponível: segue com o mês atual.
  }
  return currentMonthKey();
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState<string>(readInitialMonth);

  const setMonth = useCallback((next: string) => {
    if (!isValidMonthKey(next)) return;
    setMonthState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem persistência local, o estado da sessão continua funcionando.
    }
  }, []);

  const shiftMonth = useCallback(
    (delta: number) => {
      setMonth(addMonths(month, delta));
    },
    [month, setMonth],
  );

  const value = useMemo(
    () => ({ month, setMonth, shiftMonth }),
    [month, setMonth, shiftMonth],
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth precisa estar dentro de MonthProvider.');
  }
  return context;
}
