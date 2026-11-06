import { cn } from '../../lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700',
        className,
      )}
    >
      <span className="flex items-end gap-[3px]">
        <span className="h-2 w-1 rounded-sm bg-white/60" />
        <span className="h-3.5 w-1 rounded-sm bg-white/80" />
        <span className="h-5 w-1 rounded-sm bg-white" />
      </span>
    </span>
  );
}
