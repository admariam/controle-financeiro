import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, MoneyInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { addBankBalance } from '../../data/api';
import { centsToInput, parseAmountToCents } from '../../lib/money';
import type { BankBalance } from '../../types/db';

interface BalanceModalProps {
  open: boolean;
  onClose: () => void;
  latest: BankBalance | null;
  profileId: string;
  onSaved: () => void;
}

export function BalanceModal({
  open,
  onClose,
  latest,
  profileId,
  onSaved,
}: BalanceModalProps) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(latest ? centsToInput(latest.amount_cents) : '');
    setError(null);
    setFormError(null);
    setSaving(false);
  }, [open, latest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFormError(null);

    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Informe um valor válido.');
      return;
    }

    if (!profileId) {
      setFormError('Selecione um perfil antes de informar o saldo.');
      return;
    }

    setSaving(true);

    try {
      await addBankBalance(amountCents, profileId);
      showToast('Saldo atualizado.');
      onSaved();
      onClose();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Não foi possível salvar o saldo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Atualizar saldo"
      description="Informe o saldo atual da conta bancária. O histórico anterior é preservado."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="balance-form" loading={saving}>
            Salvar saldo
          </Button>
        </>
      }
    >
      <form id="balance-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        <Field
          label="Saldo disponível"
          htmlFor="balance-amount"
          error={error ?? undefined}
          hint="Considere o saldo que já desconta as contas pagas."
          required
        >
          <MoneyInput
            id="balance-amount"
            value={amount}
            onValueChange={setAmount}
            invalid={Boolean(error)}
            autoFocus
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-slate-500">
          O saldo projetado será calculado como este valor menos as contas pendentes do mês.
        </p>
      </form>
    </Modal>
  );
}
