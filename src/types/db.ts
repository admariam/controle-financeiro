export interface Profile {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseType = 'fixed' | 'episodic';
export type ExpenseStatus = 'pending' | 'paid';

export interface Expense {
  id: string;
  recurrence_id: string | null;
  name: string;
  category_id: string;
  amount_cents: number;
  due_date: string;
  reference_month: string;
  type: ExpenseType;
  notes: string | null;
  paid_at: string | null;
  status: ExpenseStatus;
  profile_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseRecurrence {
  id: string;
  name: string;
  category_id: string;
  amount_cents: number;
  due_day: number;
  start_month: string;
  end_month: string | null;
  is_active: boolean;
  notes: string | null;
  profile_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BankBalance {
  id: string;
  amount_cents: number;
  recorded_at: string;
  profile_id: string;
  created_by: string;
  created_at: string;
}

export interface NewExpenseInput {
  name: string;
  category_id: string;
  amount_cents: number;
  due_date: string;
  type: ExpenseType;
  notes: string | null;
  profile_id: string;
}

export interface NewRecurrenceInput {
  name: string;
  category_id: string;
  amount_cents: number;
  due_day: number;
  start_month: string;
  notes: string | null;
  profile_id: string;
}
