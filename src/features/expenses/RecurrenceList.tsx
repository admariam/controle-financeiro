import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { monthShortLabel } from '../../lib/dates';
import { formatBRL } from '../../lib/money';
import type { Category, ExpenseRecurrence, Profile } from '../../types/db';

interface RecurrenceListProps {
  recurrences: ExpenseRecurrence[];
  categories: Category[];
  profiles: Profile[];
  busyId: string | null;
  onEdit: (recurrence: ExpenseRecurrence) => void;
  onToggleActive: (recurrence: ExpenseRecurrence) => void;
  onDelete: (recurrence: ExpenseRecurrence) => void;
}

export function RecurrenceList({
  recurrences,
  categories,
  profiles,
  busyId,
  onEdit,
  onToggleActive,
  onDelete,
}: RecurrenceListProps) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const profileName = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Conta</th>
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 font-medium">Vencimento</th>
              <th className="px-3 py-3 font-medium">Início</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Perfil</th>
              <th className="px-3 py-3 text-right font-medium">Valor</th>
              <th className="px-3 py-3 font-medium">Situação</th>
              <th className="w-28 px-3 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recurrences.map((recurrence) => {
              const busy = busyId === recurrence.id;

              return (
                <tr key={recurrence.id} className="text-sm transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{recurrence.name}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {categoryName.get(recurrence.category_id) ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">Dia {recurrence.due_day}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {monthShortLabel(recurrence.start_month.slice(0, 7))}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-600 lg:table-cell">
                    {profileName.get(recurrence.profile_id) ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                    {formatBRL(recurrence.amount_cents)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={recurrence.is_active ? 'success' : 'neutral'} dot>
                      {recurrence.is_active ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleActive(recurrence)}
                        disabled={busy}
                        aria-label={
                          recurrence.is_active
                            ? `Pausar ${recurrence.name}`
                            : `Reativar ${recurrence.name}`
                        }
                        title={recurrence.is_active ? 'Pausar' : 'Reativar'}
                      >
                        {recurrence.is_active ? (
                          <Pause className="h-4 w-4" aria-hidden />
                        ) : (
                          <Play className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(recurrence)}
                        disabled={busy}
                        aria-label={`Editar ${recurrence.name}`}
                        title="Editar recorrência"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(recurrence)}
                        disabled={busy}
                        aria-label={`Excluir ${recurrence.name}`}
                        title="Excluir recorrência"
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {recurrences.map((recurrence) => {
          const busy = busyId === recurrence.id;

          return (
            <div
              key={recurrence.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{recurrence.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {categoryName.get(recurrence.category_id) ?? '—'} · Dia {recurrence.due_day} ·
                    desde {monthShortLabel(recurrence.start_month.slice(0, 7))}
                  </p>
                </div>
                <Badge tone={recurrence.is_active ? 'success' : 'neutral'} dot>
                  {recurrence.is_active ? 'Ativa' : 'Pausada'}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatBRL(recurrence.amount_cents)}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActive(recurrence)}
                    disabled={busy}
                    aria-label={
                      recurrence.is_active
                        ? `Pausar ${recurrence.name}`
                        : `Reativar ${recurrence.name}`
                    }
                  >
                    {recurrence.is_active ? (
                      <Pause className="h-4 w-4" aria-hidden />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(recurrence)}
                    disabled={busy}
                    aria-label={`Editar ${recurrence.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(recurrence)}
                    disabled={busy}
                    aria-label={`Excluir ${recurrence.name}`}
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
