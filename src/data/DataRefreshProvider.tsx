import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from '../auth/SessionProvider';

interface DataRefreshContextValue {
  version: number;
  refresh: () => void;
  scheduleRefresh: () => void;
}

const DataRefreshContext = createContext<DataRefreshContextValue | null>(null);

const TABLES = [
  'expenses',
  'expense_recurrences',
  'bank_balance_history',
  'categories',
  'profiles',
] as const;

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [version, setVersion] = useState(0);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setVersion((current) => current + 1);
    }, 200);
  }, []);

  useEffect(() => {
    if (!session) return;

    const channelName = `familia-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);

    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    const handleFocus = () => scheduleRefresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [session, scheduleRefresh]);

  const value = useMemo(
    () => ({ version, refresh, scheduleRefresh }),
    [version, refresh, scheduleRefresh],
  );

  return (
    <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>
  );
}

export function useDataRefresh(): DataRefreshContextValue {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh precisa estar dentro de DataRefreshProvider.');
  }
  return context;
}
