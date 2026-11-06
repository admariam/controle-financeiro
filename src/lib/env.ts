function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

function normalizeSupabaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  try {
    // Aceita a URL colada com /rest/v1/ no final e usa apenas a origem.
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

export const env = {
  supabaseUrl: normalizeSupabaseUrl(clean(import.meta.env.VITE_SUPABASE_URL)),
  supabaseAnonKey: clean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  sharedEmail: clean(import.meta.env.VITE_SHARED_EMAIL).toLowerCase(),
  basePath: clean(import.meta.env.VITE_BASE_PATH) || '/',
} as const;

export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 &&
  env.supabaseAnonKey.length > 0 &&
  env.sharedEmail.length > 0;
