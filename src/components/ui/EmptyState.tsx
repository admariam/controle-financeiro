import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
