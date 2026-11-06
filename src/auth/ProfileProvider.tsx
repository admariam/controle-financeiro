import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Profile } from '../types/db';
import { listProfiles } from '../data/api';
import { useSession } from './SessionProvider';

const STORAGE_KEY = 'controle-financeiro:perfil';

interface ProfileContextValue {
  profiles: Profile[];
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  selectProfile: (id: string) => void;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readStoredProfileId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(readStoredProfileId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await listProfiles();
      setProfiles(rows);

      setProfileId((current) => {
        if (current && rows.some((row) => row.id === current)) {
          return current;
        }

        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Sem armazenamento local, a seleção simplesmente não persiste.
        }
        return null;
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível carregar os perfis.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      setProfiles([]);
      setProfileId(null);
      setLoading(false);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignora indisponibilidade do armazenamento local.
      }
      return;
    }

    void loadProfiles();
  }, [session, sessionLoading, loadProfiles]);

  const selectProfile = useCallback(
    (id: string) => {
      if (!profiles.some((row) => row.id === id)) return;
      setProfileId(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Sem persistência local, a seleção continua válida nesta sessão.
      }
    },
    [profiles],
  );

  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  const value = useMemo<ProfileContextValue>(() => {
    const profile = profiles.find((row) => row.id === profileId) ?? null;
    return {
      profiles,
      profile,
      loading,
      error,
      selectProfile,
      refreshProfiles,
    };
  }, [profiles, profileId, loading, error, selectProfile, refreshProfiles]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile precisa estar dentro de ProfileProvider.');
  }
  return context;
}
