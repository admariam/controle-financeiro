import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useSession } from './SessionProvider';

export function RequireSession() {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return <FullPageSpinner label="Verificando sessão…" />;
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
