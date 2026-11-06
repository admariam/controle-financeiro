import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useProfile } from './ProfileProvider';
import { useSession } from './SessionProvider';

export function LoginPage() {
  const { session, loading, signIn } = useSession();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/';

  if (loading || (session && profileLoading)) {
    return <FullPageSpinner label="Verificando sessão…" />;
  }

  if (session) {
    return <Navigate to={profile ? redirectTo : '/perfil'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Informe a senha.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate('/perfil', { replace: true, state: { from: redirectTo } });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Controle Financeiro
        </h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <Field label="Senha" htmlFor="senha">
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={Boolean(error)}
              disabled={submitting}
            />
          </Field>

          {error ? (
            <p className="mt-3 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-5 w-full" loading={submitting}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
