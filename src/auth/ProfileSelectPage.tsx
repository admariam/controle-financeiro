import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useProfile } from './ProfileProvider';
import { useSession } from './SessionProvider';

const avatarTones = [
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-sky-50 text-sky-700 ring-sky-200',
];

export function ProfileSelectPage() {
  const { profiles, profile, loading, error, selectProfile, refreshProfiles } = useProfile();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  function handleSelect(id: string) {
    selectProfile(id);
    navigate(redirectTo, { replace: true });
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return <FullPageSpinner label="Carregando perfis…" />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">Não foi possível carregar os perfis</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => void refreshProfiles()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-4 text-xs text-slate-500 hover:text-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-xl font-semibold tracking-tight text-slate-900">
          Selecionar perfil
        </h1>

        {profiles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Nenhum perfil encontrado. Verifique a configuração do banco de dados.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {profiles.map((item, index) => {
              const selected = item.id === profile?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border bg-white px-4 py-6 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 ${
                    selected
                      ? 'border-emerald-500 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ring-1 ${
                      avatarTones[index % avatarTones.length]
                    }`}
                  >
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{item.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-xs text-slate-500 transition-colors hover:text-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
