import { KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const missingVariables = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SHARED_EMAIL',
];

export function SetupRequiredPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Configuração do Supabase necessária
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Crie o arquivo <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code>{' '}
              a partir de <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.example</code>{' '}
              e preencha as variáveis abaixo. Depois gere um novo build.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {missingVariables.map((variable) => (
            <li
              key={variable}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
            >
              {variable}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          As instruções completas estão em{' '}
          <span className="font-medium text-slate-700">supabase/README.md</span>. Use apenas a chave
          pública (anon). A chave <span className="font-medium">service_role</span> nunca deve ser
          usada no frontend.
        </p>

        <Button
          variant="secondary"
          className="mt-5 w-full"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Recarregar
        </Button>
      </Card>
    </div>
  );
}
