import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { createExpense, createRecurrence, updateExpenseDetails } from '../../data/api';
import {
  dueDateForDay,
  lastDayOfMonth,
  monthLabel,
  todayISO,
} from '../../lib/dates';
import { centsToInput, parseAmountToCents } from '../../lib/money';
import type { Category, Expense, ExpenseType, Profile } from '../../types/db';

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  month: string;
  categories: Category[];
  profiles: Profile[];
  currentProfileId: string;
  initialType?: ExpenseType;
  expense?: Expense | null;
  onSaved: () => void;
}

type FieldErrors = Partial<
  Record<'name' | 'category' | 'amount' | 'dueDate' | 'profile' | 'notes', string>
>;

function defaultDueDate(month: string): string {
  if (todayISO().startsWith(month)) return todayISO();
  return dueDateForDay(month, 5);
}

export function ExpenseFormModal({
  open,
  onClose,
  month,
  categories,
  profiles,
  currentProfileId,
  initialType = 'episodic',
  expense = null,
  onSaved,
}: ExpenseFormModalProps) {
  const { showToast } = useToast();
  const editing = Boolean(expense);
  const referenceMonth = expense?.reference_month.slice(0, 7) ?? month;

  const [type, setType] = useState<ExpenseType>(initialType);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate(month));
  const [profileId, setProfileId] = useState(currentProfileId);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setFormError(null);
    setSaving(false);

    if (expense) {
      setType(expense.type);
      setName(expense.name);
      setCategoryId(expense.category_id);
      setAmount(centsToInput(expense.amount_cents));
      setDueDate(expense.due_date);
      setProfileId(expense.profile_id);
      setNotes(expense.notes ?? '');
      return;
    }

    setType(initialType);
    setName('');
    setCategoryId(categories[0]?.id ?? '');
    setAmount('');
    setDueDate(defaultDueDate(month));
    setProfileId(currentProfileId);
    setNotes('');
    // A inicialização acontece apenas na abertura/troca do lançamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id, month, initialType, currentProfileId]);

  function validate(): number | null {
    const nextErrors: FieldErrors = {};
    const amountCents = parseAmountToCents(amount);

    if (!name.trim()) nextErrors.name = 'Informe o nome da conta.';
    else if (name.trim().length > 80) nextErrors.name = 'Use no máximo 80 caracteres.';

    if (!categoryId) nextErrors.category = 'Selecione uma categoria.';

    if (amountCents === null || amountCents <= 0) {
      nextErrors.amount = 'Informe um valor maior que zero.';
    }

    if (!dueDate) {
      nextErrors.dueDate = 'Informe a data de vencimento.';
    } else if (!dueDate.startsWith(referenceMonth)) {
      nextErrors.dueDate = `O vencimento deve ficar em ${monthLabel(referenceMonth)}.`;
    }

    if (!profileId) nextErrors.profile = 'Selecione o perfil responsável.';
    if (notes.length > 500) nextErrors.notes = 'Use no máximo 500 caracteres.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 ? amountCents : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const amountCents = validate();
    if (amountCents === null) return;

    setSaving(true);

    try {
      if (expense) {
        await updateExpenseDetails(expense.id, {
          name,
          category_id: categoryId,
          amount_cents: amountCents,
          due_date: dueDate,
          notes: notes || null,
          profile_id: profileId,
        });
        showToast('Lançamento atualizado.');
      } else if (type === 'episodic') {
        await createExpense({
          name,
          category_id: categoryId,
          amount_cents: amountCents,
          due_date: dueDate,
          type: 'episodic',
          notes: notes || null,
          profile_id: profileId,
        });
        showToast('Conta cadastrada.');
      } else {
        await createRecurrence({
          name,
          category_id: categoryId,
          amount_cents: amountCents,
          due_day: Number(dueDate.slice(8, 10)),
          start_month: `${month}-01`,
          notes: notes || null,
          profile_id: profileId,
        });
        showToast('Conta fixa cadastrada.');
      }

      onSaved();
      onClose();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Não foi possível salvar a conta.',
      );
    } finally {
      setSaving(false);
    }
  }

  const minDate = `${referenceMonth}-01`;
  const maxDate = `${referenceMonth}-${String(lastDayOfMonth(referenceMonth)).padStart(2, '0')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar lançamento' : 'Nova conta'}
      description={
        editing
          ? 'A alteração vale somente para este mês.'
          : 'Cadastre uma despesa avulsa ou uma conta fixa.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!editing ? (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Tipo de conta</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('episodic')}
                aria-pressed={type === 'episodic'}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  type === 'episodic'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="block text-sm font-medium text-slate-900">Esporádica</span>
                <span className="block text-[11px] text-slate-500">Somente este mês</span>
              </button>
              <button
                type="button"
                onClick={() => setType('fixed')}
                aria-pressed={type === 'fixed'}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  type === 'fixed'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="block text-sm font-medium text-slate-900">Fixa</span>
                <span className="block text-[11px] text-slate-500">Todo mês</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Tipo</span>
            <span className="text-xs font-medium text-slate-700">
              {expense?.type === 'fixed' ? 'Conta fixa' : 'Conta esporádica'}
            </span>
          </div>
        )}

        <Field label="Nome da conta" htmlFor="expense-name" error={errors.name} required>
          <Input
            id="expense-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="expense-category" error={errors.category} required>
            <Select
              id="expense-category"
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

          <Field label="Valor" htmlFor="expense-amount" error={errors.amount} required>
            <MoneyInput
              id="expense-amount"
              value={amount}
              onValueChange={setAmount}
              invalid={Boolean(errors.amount)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Data de vencimento"
            htmlFor="expense-due-date"
            error={errors.dueDate}
            hint={`Mês de referência: ${monthLabel(referenceMonth)}`}
            required
          >
            <Input
              id="expense-due-date"
              type="date"
              value={dueDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDueDate(event.target.value)}
              invalid={Boolean(errors.dueDate)}
            />
          </Field>

          <Field label="Perfil responsável" htmlFor="expense-profile" error={errors.profile} required>
            <Select
              id="expense-profile"
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
          htmlFor="expense-notes"
          error={errors.notes}
          hint={`Opcional · ${notes.length}/500`}
        >
          <Textarea
            id="expense-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={3}
            invalid={Boolean(errors.notes)}
          />
        </Field>

        {editing ? (
          <p className="text-[11px] leading-relaxed text-slate-500">
            Para alterar os próximos meses, edite a recorrência na aba “Recorrências”.
          </p>
        ) : type === 'fixed' ? (
          <p className="text-[11px] leading-relaxed text-slate-500">
            A conta será lançada em {monthLabel(month)} e repetida automaticamente nos meses
            seguintes.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
