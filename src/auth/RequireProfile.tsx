import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useProfile } from './ProfileProvider';

export function RequireProfile() {
  const { profile, loading } = useProfile();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner label="Carregando perfis…" />;
  }

  if (!profile) {
    return (
      <Navigate
        to="/perfil"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
