import { Badge } from '../../components/ui/Badge';
import { expenseTiming } from '../../lib/finance';
import type { Expense } from '../../types/db';

export function ExpenseStatusBadge({ expense }: { expense: Expense }) {
  const timing = expenseTiming(expense);

  if (timing === 'paid') {
    return (
      <Badge tone="success" dot>
        Paga
      </Badge>
    );
  }

  if (timing === 'overdue') {
    return (
      <Badge tone="danger" dot>
        Vencida
      </Badge>
    );
  }

  if (timing === 'due-soon') {
    return (
      <Badge tone="warning" dot>
        Pendente
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" dot>
      Pendente
    </Badge>
  );
}
