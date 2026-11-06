import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      className={cn('h-5 w-5 animate-spin text-slate-400', className)}
      aria-label="Carregando"
    />
  );
}

export function FullPageSpinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50">
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
