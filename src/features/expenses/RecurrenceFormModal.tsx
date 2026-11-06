import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { updateRecurrenceDetails } from '../../data/api';
import { monthLabel } from '../../lib/dates';
import { centsToInput, parseAmountToCents } from '../../lib/money';
import type { Category, ExpenseRecurrence, Profile } from '../../types/db';

interface RecurrenceFormModalProps {
  open: boolean;
  onClose: () => void;
  recurrence: ExpenseRecurrence | null;
  month: string;
  categories: Category[];
  profiles: Profile[];
  onSaved: () => void;
}

type FieldErrors = Partial<
  Record<'name' | 'category' | 'amount' | 'dueDay' | 'profile' | 'notes', string>
>;

export function RecurrenceFormModal({
  open,
  onClose,
  recurrence,
  month,
  categories,
  profiles,
  onSaved,
}: RecurrenceFormModalProps) {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [profileId, setProfileId] = useState('');
  const [notes, setNotes] = useState('');
  const [applyPending, setApplyPending] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !recurrence) return;

    setErrors({});
    setFormError(null);
    setSaving(false);
    setApplyPending(true);
    setName(recurrence.name);
    setCategoryId(recurrence.category_id);
    setAmount(centsToInput(recurrence.amount_cents));
    setDueDay(String(recurrence.due_day));
    setProfileId(recurrence.profile_id);
    setNotes(recurrence.notes ?? '');
  }, [open, recurrence]);

  function validate(): number | null {
    const nextErrors: FieldErrors = {};
    const amountCents = parseAmountToCents(amount);
    const day = Number(dueDay);

    if (!name.trim()) nextErrors.name = 'Informe o nome da conta.';
    else if (name.trim().length > 80) nextErrors.name = 'Use no máximo 80 caracteres.';

    if (!categoryId) nextErrors.category = 'Selecione uma categoria.';

    if (amountCents === null || amountCents <= 0) {
      nextErrors.amount = 'Informe um valor maior que zero.';
    }

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      nextErrors.dueDay = 'Informe um dia entre 1 e 31.';
    }

    if (!profileId) nextErrors.profile = 'Selecione o perfil responsável.';
    if (notes.length > 500) nextErrors.notes = 'Use no máximo 500 caracteres.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 ? amountCents : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!recurrence) return;

    const amountCents = validate();
    if (amountCents === null) return;

    setSaving(true);

    try {
      await updateRecurrenceDetails(
        recurrence.id,
        {
          name,
          category_id: categoryId,
          amount_cents: amountCents,
          due_day: Number(dueDay),
          notes: notes || null,
          profile_id: profileId,
        },
        applyPending ? month : null,
      );

      showToast('Recorrência atualizada.');
      onSaved();
      onClose();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Não foi possível salvar a recorrência.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar recorrência"
      description="As mudanças valem para os próximos lançamentos gerados."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="recurrence-form" loading={saving}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="recurrence-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Início da recorrência: <span className="font-medium">{recurrence ? monthLabel(recurrence.start_month.slice(0, 7)) : '—'}</span>
        </div>

        <Field label="Nome da conta" htmlFor="recurrence-name" error={errors.name} required>
          <Input
            id="recurrence-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="recurrence-category" error={errors.category} required>
            <Select
              id="recurrence-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              invalid={Boolean(errors.category)}
            >
              <option value="">Selecione…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Valor" htmlFor="recurrence-amount" error={errors.amount} required>
            <MoneyInput
              id="recurrence-amount"
              value={amount}
              onValueChange={setAmount}
              invalid={Boolean(errors.amount)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Dia do vencimento"
            htmlFor="recurrence-due-day"
            error={errors.dueDay}
            hint="Se o mês não tiver o dia, usa o último dia."
            required
          >
            <Input
              id="recurrence-due-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dueDay}
              onChange={(event) => setDueDay(event.target.value)}
              invalid={Boolean(errors.dueDay)}
            />
          </Field>

          <Field label="Perfil responsável" htmlFor="recurrence-profile" error={errors.profile} required>
            <Select
              id="recurrence-profile"
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              invalid={Boolean(errors.profile)}
            >
              <option value="">Selecione…</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Observação"
          htmlFor="recurrence-notes"
          error={errors.notes}
          hint={`Opcional · ${notes.length}/500`}
        >
          <Textarea
            id="recurrence-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={3}
            invalid={Boolean(errors.notes)}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
          <input
            type="checkbox"
            checked={applyPending}
            onChange={(event) => setApplyPending(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
          />
          <span className="text-xs leading-relaxed text-slate-600">
            Atualizar também os lançamentos pendentes de {monthLabel(month)} em diante.
            <span className="mt-0.5 block text-[11px] text-slate-400">
              Meses anteriores e contas já pagas não são alterados.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
