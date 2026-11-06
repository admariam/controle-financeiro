import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../../auth/ProfileProvider';
import { cn } from '../../lib/cn';

export function ProfileChip({ compact = false }: { compact?: boolean }) {
  const { profile } = useProfile();
  const location = useLocation();

  if (!profile) return null;

  const initial = profile.name.slice(0, 1).toUpperCase();

  if (compact) {
    return (
      <Link
        to="/perfil"
        state={{ from: location.pathname }}
        aria-label={`Perfil em uso: ${profile.name}. Trocar perfil`}
        title={`Perfil: ${profile.name}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        {initial}
      </Link>
    );
  }

  return (
    <Link
      to="/perfil"
      state={{ from: location.pathname }}
      className={cn(
        'flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-slate-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-slate-800">{profile.name}</span>
        <span className="block text-[10px] text-slate-400">Trocar perfil</span>
      </span>
    </Link>
  );
}
