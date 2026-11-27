import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { env } from '../lib/env';

interface SignInResult {
  error: string | null;
}

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function translateAuthError(message: string, status?: number): string {
  if (status === 429 || /rate limit|too many/i.test(message)) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }

  if (/invalid login credentials/i.test(message)) {
    return 'Senha incorreta.';
  }

  if (/email not confirmed/i.test(message)) {
    return 'Usuário ainda não confirmado. Verifique a configuração do Supabase.';
  }

  if (/failed to fetch|network|load failed/i.test(message) || status === 0) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Você está sem internet. Verifique a conexão e tente novamente.';
    }
    return 'O servidor do sistema não respondeu. Ele pode estar pausado ou fora do ar; tente novamente em alguns minutos.';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'O servidor do sistema está com problema no momento. Tente novamente em alguns minutos.';
  }

  return 'Não foi possível entrar. Tente novamente.';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: env.sharedEmail,
      password,
    });

    if (error) {
      return { error: translateAuthError(error.message, error.status) };
    }

    setSession(data.session);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession precisa estar dentro de SessionProvider.');
  }
  return context;
}
