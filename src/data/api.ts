import { supabase } from '../lib/supabase';
import type {
  BankBalance,
  Category,
  Expense,
  ExpenseRecurrence,
  NewExpenseInput,
  NewRecurrenceInput,
  Profile,
} from '../types/db';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function describeError(error: { message: string } | null): never {
  throw new ApiError(error?.message || 'Não foi possível concluir a operação.');
}

// ---------------------------------------------------------------------------
// Perfis
// ---------------------------------------------------------------------------

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('id');

  if (error) describeError(error);
  return (data ?? []) as Profile[];
}

export async function updateProfileName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ name: name.trim() })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      throw new ApiError('Já existe um perfil com esse nome.');
    }
    describeError(error);
  }
}

export async function updateProfileNameSafe(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new ApiError('O nome do perfil deve ter entre 1 e 40 caracteres.');
  }
  await updateProfileName(id, trimmed);
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');

  if (error) describeError(error);
  return (data ?? []) as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ApiError('Já existe uma categoria com esse nome.');
    }
    describeError(error);
  }

  return data as Category;
}

export async function updateCategoryName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      throw new ApiError('Já existe uma categoria com esse nome.');
    }
    describeError(error);
  }
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export async function listExpensesForMonth(month: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('reference_month', `${month}-01`)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) describeError(error);
  return (data ?? []) as Expense[];
}

export async function listExpensesInRange(
  startMonth: string,
  endMonth: string,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('reference_month', `${startMonth}-01`)
    .lte('reference_month', `${endMonth}-01`)
    .is('deleted_at', null)
    .order('reference_month', { ascending: true })
    .order('due_date', { ascending: true });

  if (error) describeError(error);
  return (data ?? []) as Expense[];
}

export async function createExpense(input: NewExpenseInput): Promise<void> {
  const { error } = await supabase.from('expenses').insert({
    name: input.name.trim(),
    category_id: input.category_id,
    amount_cents: input.amount_cents,
    due_date: input.due_date,
    reference_month: `${input.due_date.slice(0, 7)}-01`,
    type: input.type,
    notes: input.notes?.trim() || null,
    profile_id: input.profile_id,
  });

  if (error) describeError(error);
}

export interface ExpenseDetailsInput {
  name: string;
  category_id: string;
  amount_cents: number;
  due_date: string;
  notes: string | null;
  profile_id: string;
}

export async function updateExpenseDetails(
  id: string,
  input: ExpenseDetailsInput,
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({
      name: input.name.trim(),
      category_id: input.category_id,
      amount_cents: input.amount_cents,
      due_date: input.due_date,
      notes: input.notes?.trim() || null,
      profile_id: input.profile_id,
    })
    .eq('id', id);

  if (error) describeError(error);
}

export async function setExpensePaid(id: string, paid: boolean): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id);

  if (error) describeError(error);
}

export async function softDeleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) describeError(error);
}

// ---------------------------------------------------------------------------
// Recorrências
// ---------------------------------------------------------------------------

export async function listRecurrences(): Promise<ExpenseRecurrence[]> {
  const { data, error } = await supabase
    .from('expense_recurrences')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) describeError(error);
  return (data ?? []) as ExpenseRecurrence[];
}

export async function createRecurrence(
  input: NewRecurrenceInput,
): Promise<ExpenseRecurrence> {
  const { data, error } = await supabase
    .from('expense_recurrences')
    .insert({
      name: input.name.trim(),
      category_id: input.category_id,
      amount_cents: input.amount_cents,
      due_day: input.due_day,
      start_month: input.start_month,
      notes: input.notes?.trim() || null,
      profile_id: input.profile_id,
    })
    .select('*')
    .single();

  if (error) describeError(error);

  await generateRecurringExpenses(input.start_month, input.start_month);
  return data as ExpenseRecurrence;
}

export interface RecurrenceDetailsInput {
  name: string;
  category_id: string;
  amount_cents: number;
  due_day: number;
  notes: string | null;
  profile_id: string;
}

export async function updateRecurrenceDetails(
  id: string,
  input: RecurrenceDetailsInput,
  applyFromMonth: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('expense_recurrences')
    .update({
      name: input.name.trim(),
      category_id: input.category_id,
      amount_cents: input.amount_cents,
      due_day: input.due_day,
      notes: input.notes?.trim() || null,
      profile_id: input.profile_id,
    })
    .eq('id', id);

  if (error) describeError(error);

  if (applyFromMonth) {
    const { error: applyError } = await supabase.rpc('apply_recurrence_to_pending', {
      p_recurrence_id: id,
      p_from_month: `${applyFromMonth}-01`,
    });

    if (applyError) describeError(applyError);
  }
}

export async function setRecurrenceActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('expense_recurrences')
    .update({ is_active: active })
    .eq('id', id);

  if (error) describeError(error);
}

export async function deleteRecurrenceRecord(
  id: string,
  fromMonth: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('delete_recurrence', {
    p_recurrence_id: id,
    p_from_month: `${fromMonth}-01`,
  });

  if (error) describeError(error);
  return Number(data ?? 0);
}

export async function generateRecurringExpenses(
  startMonth: string,
  endMonth: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('generate_recurring_expenses', {
    p_start: `${startMonth}-01`,
    p_end: `${endMonth}-01`,
  });

  if (error) describeError(error);
  return Number(data ?? 0);
}

// ---------------------------------------------------------------------------
// Saldo bancário
// ---------------------------------------------------------------------------

export async function latestBankBalance(): Promise<BankBalance | null> {
  const { data, error } = await supabase
    .from('bank_balance_history')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) describeError(error);
  return (data as BankBalance | null) ?? null;
}

export async function listBankBalanceHistory(limit = 100): Promise<BankBalance[]> {
  const { data, error } = await supabase
    .from('bank_balance_history')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) describeError(error);
  return (data ?? []) as BankBalance[];
}

export async function addBankBalance(
  amountCents: number,
  profileId: string,
): Promise<void> {
  const { error } = await supabase.from('bank_balance_history').insert({
    amount_cents: amountCents,
    profile_id: profileId,
  });

  if (error) describeError(error);
}
